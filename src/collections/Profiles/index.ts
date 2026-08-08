import type { CollectionConfig, TextFieldSingleValidation } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { isAdminUser } from '@/utilities/isAdminUser'
import { slugField } from 'payload'

export const Profiles: CollectionConfig = {
  slug: 'profiles',
  labels: {
    plural: 'Perfil',
    singular: 'Perfil',
  },
  indexes: [
    {
      fields: ['owner'],
      unique: true,
    },
  ],
  access: {
    admin: authenticated,
    create: ({ req }) => isAdminUser(req.user),
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
    components: {
      beforeList: ['@/components/CreatorProfileListRedirect'],
      views: {
        edit: {
          api: {
            tab: {
              condition: ({ req }) => isAdminUser(req.user),
            },
          },
        },
      },
    },
    defaultColumns: ['displayName', 'accountType', 'slug', 'updatedAt'],
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
      ],
      required: true,
    },
    {
      name: 'bio',
      type: 'textarea',
      admin: {
        hidden: true,
      },
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
      admin: {
        hidden: true,
      },
    },
    {
      name: 'location',
      type: 'text',
      validate: ((value, options) => {
        if (options.req.user?.role !== 'creator') return true
        if (options.operation === 'create') return true

        return typeof value === 'string' && value.trim().length > 0
          ? true
          : 'El país es obligatorio para creadores.'
      }) as TextFieldSingleValidation,
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
      admin: {
        hidden: true,
      },
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
    {
      name: 'mercadoPagoConnection',
      type: 'group',
      admin: {
        hidden: true,
      },
      fields: [
        {
          name: 'status',
          type: 'select',
          defaultValue: 'not_connected',
          options: [
            {
              label: 'Not connected',
              value: 'not_connected',
            },
            {
              label: 'Connecting',
              value: 'connecting',
            },
            {
              label: 'Connected',
              value: 'connected',
            },
            {
              label: 'Action required',
              value: 'action_required',
            },
          ],
        },
        {
          name: 'sellerID',
          type: 'text',
        },
        {
          name: 'sellerEmail',
          type: 'email',
        },
        {
          name: 'sellerNickname',
          type: 'text',
        },
        {
          name: 'oauthState',
          type: 'text',
        },
        {
          name: 'encryptedAccessToken',
          type: 'textarea',
        },
        {
          name: 'encryptedRefreshToken',
          type: 'textarea',
        },
        {
          name: 'accessTokenExpiresAt',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'lastConnectedAt',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'lastError',
          type: 'textarea',
        },
      ],
    },
    slugField({
      useAsSlug: 'displayName',
    }),
  ],
}
