'use client'

import { formatAdminURL } from 'payload/shared'

import { createClientUploadHandler } from '@payloadcms/plugin-cloud-storage/client'
import { getFileKey } from '@payloadcms/plugin-cloud-storage/utilities'
import { upload } from '@vercel/blob/client'

function posixBasename(key: string) {
  const normalized = key.replace(/^\/+/, '')
  const lastSlash = normalized.lastIndexOf('/')

  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1)
}

function formatUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (message.toLowerCase().includes('already exists')) {
    return new Error(
      'oddsound no pudo reemplazar este archivo en este momento. Intenta guardar nuevamente.',
    )
  }

  return new Error(
    'oddsound no pudo cargar tu imagen en este momento. Intenta nuevamente en unos segundos.',
  )
}

export const OddsoundVercelBlobClientUploadHandler = createClientUploadHandler({
  handler: async ({
    apiRoute,
    collectionSlug,
    docPrefix,
    extra: { addRandomSuffix, useCompositePrefixes = false },
    file,
    prefix,
    serverHandlerPath,
    serverURL,
    updateFilename,
  }) => {
    try {
      const endpointRoute = formatAdminURL({
        apiRoute,
        path: serverHandlerPath,
        serverURL,
      })

      const { fileKey: pathname, sanitizedDocPrefix } = getFileKey({
        collectionPrefix: prefix,
        docPrefix,
        filename: file.name,
        useCompositePrefixes: Boolean(useCompositePrefixes),
      })

      const result = await upload(pathname, file, {
        access: 'public',
        clientPayload: collectionSlug,
        contentType: file.type,
        handleUploadUrl: endpointRoute,
      })

      if (addRandomSuffix) {
        const nextPathname = result.pathname.replace(/^\/+/, '')
        updateFilename(decodeURIComponent(posixBasename(nextPathname)))
      }

      return {
        prefix: sanitizedDocPrefix,
      }
    } catch (error) {
      throw formatUploadError(error)
    }
  },
})
