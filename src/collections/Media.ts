import type { CollectionAfterReadHook, CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { authenticated } from '../access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { assignOwnership } from '@/hooks/assignOwnership'
import { isAdminUser } from '@/utilities/isAdminUser'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const LEGACY_MEDIA_API_SEGMENT = '/api/media/file/'
const LOCAL_MEDIA_DIR = path.resolve(dirname, '../../public/media')
const localMediaExistsCache = new Map<string, boolean>()

function getLocalMediaPath(fileName?: null | string) {
  if (!fileName) return null

  return path.resolve(LOCAL_MEDIA_DIR, fileName)
}

function localMediaFileExists(fileName?: null | string) {
  if (!fileName) return false

  const cached = localMediaExistsCache.get(fileName)

  if (typeof cached === 'boolean') {
    return cached
  }

  const localPath = getLocalMediaPath(fileName)

  const exists = localPath ? fs.existsSync(localPath) : false

  localMediaExistsCache.set(fileName, exists)

  return exists
}

export function rewriteLegacyMediaURL(url?: null | string) {
  if (!url || !url.includes(LEGACY_MEDIA_API_SEGMENT)) return url

  try {
    const parsedURL = new URL(url)
    const fileName = decodeURIComponent(path.basename(parsedURL.pathname))

    // Blob-backed uploads do not exist in public/media, so in that case we must
    // preserve the original Payload/Blob URL instead of forcing a local path.
    if (!localMediaFileExists(fileName)) {
      return `${parsedURL.pathname}${parsedURL.search}`
    }

    parsedURL.pathname = parsedURL.pathname.replace(LEGACY_MEDIA_API_SEGMENT, '/media/')

    return `${parsedURL.pathname}${parsedURL.search}`
  } catch {
    const fileName = decodeURIComponent(path.basename(url))

    if (!localMediaFileExists(fileName)) {
      return url
    }

    return url.replace(LEGACY_MEDIA_API_SEGMENT, '/media/')
  }
}

const normalizeLegacyMediaURLs: CollectionAfterReadHook = ({ doc }) => {
  if (!doc || typeof doc !== 'object') return doc

  const nextDoc = { ...doc } as typeof doc & {
    filename?: null | string
    sizes?: Record<string, null | { filename?: null | string; url?: null | string }>
    thumbnailURL?: null | string
    url?: null | string
  }

  if (typeof nextDoc.url === 'string' && nextDoc.url.includes(LEGACY_MEDIA_API_SEGMENT)) {
    nextDoc.url = rewriteLegacyMediaURL(nextDoc.url)
  }

  if (typeof nextDoc.thumbnailURL === 'string' && nextDoc.thumbnailURL.includes(LEGACY_MEDIA_API_SEGMENT)) {
    nextDoc.thumbnailURL = rewriteLegacyMediaURL(nextDoc.thumbnailURL)
  }

  if (nextDoc.sizes && typeof nextDoc.sizes === 'object') {
    const sizes = nextDoc.sizes as Record<
      string,
      | null
      | {
          filename?: null | string
          url?: null | string
        }
    >

    nextDoc.sizes = Object.fromEntries(
      Object.entries(sizes).map(([key, value]) => {
        if (!value || typeof value !== 'object') return [key, value]

        if (typeof value.url === 'string' && value.url.includes(LEGACY_MEDIA_API_SEGMENT)) {
          return [
            key,
            {
              ...value,
              url: rewriteLegacyMediaURL(value.url),
            },
          ]
        }

        return [key, value]
      }),
    )
  }

  return nextDoc
}

export const Media: CollectionConfig = {
  slug: 'media',
  indexes: [
    {
      fields: ['owner', 'updatedAt'],
    },
    {
      fields: ['profile', 'updatedAt'],
    },
  ],
  access: {
    admin: authenticated,
    create: authenticated,
    delete: async ({ req }) => {
      const user = req.user

      if (!user) return false
      if (await hasFreshAdminAccess(req as any)) return true

      return {
        owner: {
          equals: user.id,
        },
      }
    },
    read: async ({ req }) => {
      const user = req.user

      if (!user) return true
      if (await hasFreshAdminAccess(req as any)) return true

      return {
        owner: {
          equals: user.id,
        },
      }
    },
    update: async ({ req }) => {
      const user = req.user

      if (!user) return false
      if (await hasFreshAdminAccess(req as any)) return true

      return {
        owner: {
          equals: user.id,
        },
      }
    },
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      access: {
        create: ({ req: { user } }) => Boolean(user),
        read: ({ req: { user } }) => isAdminUser(user),
        update: ({ req: { user } }) => Boolean(user),
      },
      admin: {
        hidden: true,
      },
    },
    {
      name: 'profile',
      type: 'relationship',
      relationTo: 'profiles',
      access: {
        create: ({ req: { user } }) => Boolean(user),
        read: ({ req: { user } }) => isAdminUser(user),
        update: ({ req: { user } }) => Boolean(user),
      },
      admin: {
        hidden: true,
      },
    },
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    // Local storage remains configured for development and legacy records. When
    // the Blob plugin is enabled in production, Payload disables local storage
    // for this collection and serves files through the custom Blob adapter.
    staticDir: path.resolve(dirname, '../../public/media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    pasteURL: false,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        width: 600,
      },
      {
        name: 'medium',
        width: 900,
      },
      {
        name: 'large',
        width: 1400,
      },
      {
        name: 'xlarge',
        width: 1920,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
  hooks: {
    afterRead: [normalizeLegacyMediaURLs],
    beforeChange: [assignOwnership],
  },
}
