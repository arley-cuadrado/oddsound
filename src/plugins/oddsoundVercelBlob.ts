import { APIError, Forbidden, Plugin } from 'payload'
import path from 'path'

import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import {
  getFileKey,
  getFilePrefix as getDocumentPrefix,
  initClientUploads,
} from '@payloadcms/plugin-cloud-storage/utilities'
import { BlobNotFoundError, del, head, put } from '@vercel/blob'
import { handleUpload } from '@vercel/blob/client'

import { getBlobRangeRequestInfo } from './blobRange'

type OddsoundVercelBlobStorageOptions = {
  access?: 'public'
  addRandomSuffix?: boolean
  alwaysInsertFields?: boolean
  cacheControlMaxAge?: number
  clientUploads?: boolean | { access?: ({ collectionSlug, req }: any) => boolean | Promise<boolean> }
  collections: Record<string, any>
  enabled?: boolean
  token: string | undefined
  useCompositePrefixes?: boolean
}

const defaultUploadOptions = {
  access: 'public' as const,
  addRandomSuffix: false,
  cacheControlMaxAge: 60 * 60 * 24 * 365,
  enabled: true,
}

const defaultAccess = ({ req }: { req: any }) => !!req.user

// This adapter intentionally preserves Payload's media document shape so the
// hero, home releases, and search flows do not change when storage internals
// are hardened for Vercel Blob.

function formatStorageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (message.toLowerCase().includes('already exists')) {
    return new APIError(
      'oddsound no pudo reemplazar este archivo en este momento. Intenta guardar nuevamente.',
    )
  }

  return new APIError(
    'oddsound no pudo procesar esta imagen en este momento. Intenta nuevamente en unos segundos.',
  )
}

function generateBlobURL({
  baseUrl,
  collectionPrefix = '',
  filename,
  prefix,
  useCompositePrefixes = false,
}: {
  baseUrl: string
  collectionPrefix?: string
  filename: string
  prefix?: string
  useCompositePrefixes?: boolean
}) {
  const { fileKey: fileKeyWithPrefix } = getFileKey({
    collectionPrefix,
    docPrefix: prefix,
    filename,
    useCompositePrefixes,
  })

  const dir = path.posix.dirname(fileKeyWithPrefix)
  const encodedFilename = encodeURIComponent(path.posix.basename(fileKeyWithPrefix))
  const fileKeyWithEncodedFilename = dir === '.' ? encodedFilename : path.posix.join(dir, encodedFilename)

  return `${baseUrl}/${fileKeyWithEncodedFilename}`
}

async function deleteBlobFile({
  baseUrl,
  collectionPrefix = '',
  docPrefix,
  filename,
  token,
  useCompositePrefixes = false,
}: {
  baseUrl: string
  collectionPrefix?: string
  docPrefix?: string
  filename: string
  token: string
  useCompositePrefixes?: boolean
}) {
  const fileUrl = generateBlobURL({
    baseUrl,
    collectionPrefix,
    filename,
    prefix: docPrefix,
    useCompositePrefixes,
  })

  await del(fileUrl, { token })
}

async function getBlobFile({
  baseUrl,
  cacheControlMaxAge,
  clientUploadContext,
  collection,
  collectionPrefix = '',
  filename,
  incomingHeaders,
  prefixQueryParam,
  req,
  token,
  useCompositePrefixes = false,
}: {
  baseUrl: string
  cacheControlMaxAge: number
  clientUploadContext: string | null | undefined
  collection: any
  collectionPrefix?: string
  filename: string
  incomingHeaders: Headers
  prefixQueryParam?: string
  req: any
  token: string
  useCompositePrefixes?: boolean
}) {
  try {
    const docPrefix = await getDocumentPrefix({
      clientUploadContext,
      collection,
      filename,
      prefixQueryParam,
      req,
    })

    const fileUrl = generateBlobURL({
      baseUrl,
      collectionPrefix,
      filename,
      prefix: docPrefix,
      useCompositePrefixes,
    })

    const etagFromHeaders = req.headers.get('etag') || req.headers.get('if-none-match')
    const blobMetadata = await head(fileUrl, { token })
    const { contentDisposition, contentType, size, uploadedAt } = blobMetadata
    const uploadedAtString = uploadedAt.toISOString()
    const fileKeyForETag = fileUrl.replace(`${baseUrl}/`, '')
    const ETag = `"${fileKeyForETag}-${uploadedAtString}"`

    const rangeHeader = req.headers.get('range')
    const rangeResult = getBlobRangeRequestInfo({
      fileSize: size,
      rangeHeader,
    })

    if (rangeResult.type === 'invalid') {
      return new Response(null, {
        headers: new Headers(rangeResult.headers),
        status: rangeResult.status,
      })
    }

    let headers = new Headers(incomingHeaders)

    for (const [key, value] of Object.entries(rangeResult.headers)) {
      headers.append(key, value)
    }

    headers.append('Cache-Control', `public, max-age=${cacheControlMaxAge}`)
    headers.append('Content-Disposition', contentDisposition)
    headers.append('Content-Type', contentType)
    headers.append('ETag', ETag)

    if (contentType === 'image/svg+xml') {
      headers.append('Content-Security-Policy', "script-src 'none'")
    }

    if (
      collection.upload &&
      typeof collection.upload === 'object' &&
      typeof collection.upload.modifyResponseHeaders === 'function'
    ) {
      headers = collection.upload.modifyResponseHeaders({ headers }) || headers
    }

    if (etagFromHeaders && etagFromHeaders === ETag) {
      return new Response(null, {
        headers,
        status: 304,
      })
    }

    const response = await fetch(`${fileUrl}?${uploadedAtString}`, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        ...(rangeResult.type === 'partial'
          ? {
              Range: `bytes=${rangeResult.rangeStart}-${rangeResult.rangeEnd}`,
            }
          : {}),
      },
    })

    if (!response.ok || !response.body) {
      return new Response(null, {
        status: 204,
        statusText: 'No Content',
      })
    }

    headers.append('Last-Modified', uploadedAtString)

    return new Response(response.body, {
      headers,
      status: rangeResult.status,
    })
  } catch (err) {
    if (err instanceof BlobNotFoundError) {
      return new Response(null, {
        status: 404,
        statusText: 'Not Found',
      })
    }

    req.payload.logger.error({
      err,
      msg: 'Unexpected error in staticHandler',
    })

    return new Response('Internal Server Error', {
      status: 500,
    })
  }
}

function getClientUploadRoute({
  access = defaultAccess,
  addRandomSuffix,
  cacheControlMaxAge,
  token,
}: {
  access?: ({ collectionSlug, req }: any) => boolean | Promise<boolean>
  addRandomSuffix?: boolean
  cacheControlMaxAge?: number
  token: string
}) {
  return async (req: any) => {
    const body = await req.json()

    try {
      const jsonResponse = await handleUpload({
        body,
        onBeforeGenerateToken: async (_pathname: string, collectionSlug: string | null) => {
          if (!collectionSlug) {
            throw new APIError('No payload was provided')
          }

          if (!(await access({ collectionSlug, req }))) {
            throw new Forbidden()
          }

          return Promise.resolve({
            addRandomSuffix,
            allowOverwrite: true,
            cacheControlMaxAge,
          })
        },
        onUploadCompleted: async () => {},
        request: req,
        token,
      })

      return Response.json(jsonResponse)
    } catch (error) {
      req.payload.logger.error(error)
      throw formatStorageError(error)
    }
  }
}

async function uploadFile({
  access,
  addRandomSuffix,
  buffer,
  cacheControlMaxAge,
  collectionPrefix = '',
  docPrefix,
  filename,
  mimeType,
  token,
  useCompositePrefixes = false,
}: {
  access: 'public'
  addRandomSuffix?: boolean
  buffer: Buffer
  cacheControlMaxAge: number
  collectionPrefix?: string
  docPrefix?: string
  filename: string
  mimeType: string
  token: string
  useCompositePrefixes?: boolean
}) {
  const { fileKey } = getFileKey({
    collectionPrefix,
    docPrefix,
    filename,
    useCompositePrefixes,
  })

  const result = await put(fileKey, buffer, {
    access,
    addRandomSuffix,
    allowOverwrite: true,
    cacheControlMaxAge,
    contentType: mimeType,
    token,
  })

  if (addRandomSuffix) {
    const pathname = result.pathname.replace(/^\/+/, '')
    const basename = path.posix.basename(pathname)

    return {
      filename: decodeURIComponent(basename),
    }
  }

  return {}
}

function createOddsoundVercelBlobAdapter({
  access,
  addRandomSuffix,
  baseUrl,
  cacheControlMaxAge,
  clientUploads,
  token,
  useCompositePrefixes = false,
}: {
  access: 'public'
  addRandomSuffix?: boolean
  baseUrl: string
  cacheControlMaxAge: number
  clientUploads?: boolean | object
  token: string
  useCompositePrefixes?: boolean
}) {
  return ({ collection, prefix = '' }: { collection: any; prefix?: string }) => ({
    name: 'vercel-blob',
    clientUploads,
    generateURL: ({ filename, prefix: urlPrefix = '' }: { filename: string; prefix?: string }) =>
      generateBlobURL({
        baseUrl,
        collectionPrefix: prefix,
        filename,
        prefix: urlPrefix,
        useCompositePrefixes,
      }),
    handleDelete: ({ doc: { prefix: docPrefix = '' }, filename }: { doc: any; filename: string }) =>
      deleteBlobFile({
        baseUrl,
        collectionPrefix: prefix,
        docPrefix,
        filename,
        token,
        useCompositePrefixes,
      }),
    handleUpload: async ({
      data,
      file: { buffer, filename, mimeType },
    }: {
      data: any
      file: { buffer: Buffer; filename: string; mimeType: string }
    }) => {
      const result = await uploadFile({
        access,
        addRandomSuffix,
        buffer,
        cacheControlMaxAge,
        collectionPrefix: prefix,
        docPrefix: data.prefix,
        filename,
        mimeType,
        token,
        useCompositePrefixes,
      })

      if ('filename' in result && result.filename) {
        data.filename = result.filename
      }

      return data
    },
    staticHandler: (
      req: any,
      { headers, params: { clientUploadContext, filename, prefix: prefixQueryParam } }: any,
    ) =>
      getBlobFile({
        baseUrl,
        cacheControlMaxAge,
        clientUploadContext,
        collection,
        collectionPrefix: prefix,
        filename,
        incomingHeaders: headers,
        prefixQueryParam,
        req,
        token,
        useCompositePrefixes,
      }),
  })
}

export const oddsoundVercelBlobStorage =
  (options: OddsoundVercelBlobStorageOptions): Plugin =>
  (incomingConfig) => {
    const storeId = options.token?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase()
    const isPluginDisabled = options.enabled === false || !options.token

    if (!storeId && !isPluginDisabled) {
      throw new Error(
        'Invalid token format for Vercel Blob adapter. Should be vercel_blob_rw_<store_id>_<random_string>.',
      )
    }

    const optionsWithDefaults = {
      ...defaultUploadOptions,
      ...options,
    }

    const baseUrl =
      process.env.STORAGE_VERCEL_BLOB_BASE_URL ||
      `https://${storeId}.${optionsWithDefaults.access}.blob.vercel-storage.com`

    initClientUploads({
      clientHandler: '@/plugins/oddsoundVercelBlob.client#OddsoundVercelBlobClientUploadHandler',
      collections: options.collections,
      config: incomingConfig,
      enabled: !isPluginDisabled && Boolean(options.clientUploads),
      extraClientHandlerProps: () => ({
        addRandomSuffix: !!optionsWithDefaults.addRandomSuffix,
        useCompositePrefixes: !!options.useCompositePrefixes,
      }),
      serverHandler: getClientUploadRoute({
        access: typeof options.clientUploads === 'object' ? options.clientUploads.access : undefined,
        addRandomSuffix: optionsWithDefaults.addRandomSuffix,
        cacheControlMaxAge: options.cacheControlMaxAge,
        token: options.token ?? '',
      }),
      serverHandlerPath: '/oddsound-vercel-blob-client-upload-route',
    })

    if (isPluginDisabled) {
      if (options.alwaysInsertFields) {
        const collectionsWithoutAdapter = Object.entries(options.collections).reduce(
          (acc, [slug, collOptions]) => ({
            ...acc,
            [slug]: {
              ...(collOptions === true ? {} : collOptions),
              adapter: null,
            },
          }),
          {},
        )

        return cloudStoragePlugin({
          alwaysInsertFields: true,
          collections: collectionsWithoutAdapter,
          enabled: false,
          useCompositePrefixes: options.useCompositePrefixes,
        })(incomingConfig)
      }

      return incomingConfig
    }

    const adapter = createOddsoundVercelBlobAdapter({
      access: optionsWithDefaults.access ?? 'public',
      addRandomSuffix: optionsWithDefaults.addRandomSuffix,
      baseUrl,
      cacheControlMaxAge: optionsWithDefaults.cacheControlMaxAge ?? 60 * 60 * 24 * 365,
      clientUploads: optionsWithDefaults.clientUploads,
      token: options.token!,
      useCompositePrefixes: options.useCompositePrefixes,
    })

    const collectionsWithAdapter: Record<string, any> = Object.entries(options.collections).reduce(
      (acc, [slug, collOptions]) => ({
        ...acc,
        [slug]: {
          ...(collOptions === true ? {} : collOptions),
          adapter,
        },
      }),
      {},
    )

    const config = {
      ...incomingConfig,
      collections: (incomingConfig.collections || []).map((collection) => {
        if (!collectionsWithAdapter[collection.slug]) {
          return collection
        }

        return {
          ...collection,
          upload: {
            ...(typeof collection.upload === 'object' ? collection.upload : {}),
            disableLocalStorage: true,
          },
        }
      }),
    }

    return cloudStoragePlugin({
      alwaysInsertFields: options.alwaysInsertFields,
      collections: collectionsWithAdapter,
      useCompositePrefixes: options.useCompositePrefixes,
    })(config)
  }
