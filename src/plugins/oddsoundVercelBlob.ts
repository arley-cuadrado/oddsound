import { APIError, Forbidden, Plugin } from 'payload'
import path from 'path'

import { handleUpload } from '../../node_modules/.pnpm/node_modules/@vercel/blob/dist/client.js'
import { cloudStoragePlugin } from '../../node_modules/.pnpm/@payloadcms+plugin-cloud-storage@3.84.1_@types+react@19.2.14_monaco-editor@0.55.1_next@_8b1bf8b11c8414d2565a0af7c54bb3cf/node_modules/@payloadcms/plugin-cloud-storage/dist/index.js'
import { getFileKey, initClientUploads } from '../../node_modules/.pnpm/@payloadcms+plugin-cloud-storage@3.84.1_@types+react@19.2.14_monaco-editor@0.55.1_next@_8b1bf8b11c8414d2565a0af7c54bb3cf/node_modules/@payloadcms/plugin-cloud-storage/dist/exports/utilities.js'
import { put } from '../../node_modules/.pnpm/node_modules/@vercel/blob/dist/index.js'
import { deleteFile } from '../../node_modules/@payloadcms/storage-vercel-blob/dist/deleteFile.js'
import { generateURL } from '../../node_modules/@payloadcms/storage-vercel-blob/dist/generateURL.js'
import { getFile } from '../../node_modules/@payloadcms/storage-vercel-blob/dist/getFile.js'

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
      generateURL({
        baseUrl,
        collectionPrefix: prefix,
        filename,
        prefix: urlPrefix,
        useCompositePrefixes,
      }),
    handleDelete: ({ doc: { prefix: docPrefix = '' }, filename }: { doc: any; filename: string }) =>
      deleteFile({
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
      getFile({
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
