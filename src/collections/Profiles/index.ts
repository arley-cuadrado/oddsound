import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { isAdmin } from '@/access/isAdmin'
import { isAdminUser } from '@/utilities/isAdminUser'
import { slugField } from 'payload'

export const Profiles: CollectionConfig = {
  slug: 'profiles',
  access: {
    admin: authenticated,
    create: authenticated,
    delete: async ({ req }) => {
      const user = req.user

      if (!user) return false

      if (await hasFreshAdminAccess(req as any)) {
        return {
          owner: {
            not_equals: user.id,
          },
        }
      }

      return false
    },
    read: async ({ req }) => {
      const user = req.user

      if (!user) return false
      if (await hasFreshAdminAccess(req as any)) {
        return {
          owner: {
            not_equals: user.id,
          },
        }
      }

      return {
        owner: {
          equals: user.id,
        },
      }
    },
    update: async ({ req }) => {
      const user = req.user

      if (!user) return false
      if (await hasFreshAdminAccess(req as any)) {
        return {
          owner: {
            not_equals: user.id,
          },
        }
      }

      return {
        owner: {
          equals: user.id,
        },
      }
    },
  },
  admin: {
    defaultColumns: ['displayName', 'accountType', 'slug', 'updatedAt'],
    hidden: ({ user }) => !isAdminUser(user as { role?: null | string } | null | undefined),
    useAsTitle: 'displayName',
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: {
        create: ({ req: { user } }) => isAdminUser(user),
        read: ({ req: { user } }) => isAdminUser(user),
        update: ({ req: { user } }) => isAdminUser(user),
      },
      admin: {
        hidden: true,
      },
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
    },
    {
      name: 'accountType',
      type: 'select',
      defaultValue: 'artist',
      options: [
        {
          label: 'Artista',
          value: 'artist',
        },
        {
          label: 'Banda',
          value: 'band',
        },
        {
          label: 'Sello',
          value: 'label',
        },
      ],
      required: true,
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'genre',
      type: 'text',
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },
    slugField({
      useAsSlug: 'displayName',
    }),
  ],
}
