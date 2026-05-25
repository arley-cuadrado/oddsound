import type { CollectionAfterReadHook, CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { authenticated } from '../access/authenticated'
import { assignOwnership } from '@/hooks/assignOwnership'
import { isAdminUser } from '@/utilities/isAdminUser'
import { getServerSideURL } from '@/utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const LEGACY_MEDIA_API_SEGMENT = '/api/media/file/'

function buildLegacyStaticMediaURL(fileName?: null | string) {
  if (!fileName) return fileName

  return new URL(`/media/${encodeURIComponent(fileName)}`, getServerSideURL()).toString()
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
    nextDoc.url = buildLegacyStaticMediaURL(nextDoc.filename)
  }

  if (typeof nextDoc.thumbnailURL === 'string' && nextDoc.thumbnailURL.includes(LEGACY_MEDIA_API_SEGMENT)) {
    const thumbnailFilename =
      typeof nextDoc.sizes?.thumbnail === 'object' ? nextDoc.sizes.thumbnail?.filename : null

    nextDoc.thumbnailURL = buildLegacyStaticMediaURL(thumbnailFilename || nextDoc.filename)
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
              url: buildLegacyStaticMediaURL(value.filename),
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
  access: {
    admin: authenticated,
    create: authenticated,
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (isAdminUser(user)) return true

      return {
        owner: {
          equals: user.id,
        },
      }
    },
    read: ({ req: { user } }) => {
      if (!user) return true
      if (isAdminUser(user)) return true

      return {
        owner: {
          equals: user.id,
        },
      }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (isAdminUser(user)) return true

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
    // Upload to the public/media directory in Next.js making them publicly accessible even outside of Payload
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
