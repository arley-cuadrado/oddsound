import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { assignOwnership } from '@/hooks/assignOwnership'
import { Content } from '@/blocks/Content/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { isAdminUser } from '@/utilities/isAdminUser'

export const Biographies: CollectionConfig = {
  slug: 'biographies',
  labels: {
    plural: 'Biografía',
    singular: 'Biografía',
  },
  indexes: [
    {
      fields: ['owner'],
      unique: true,
    },
    {
      fields: ['profile', 'updatedAt'],
    },
  ],
  access: {
    admin: authenticated,
    create: ({ req }) => isAdminUser(req.user),
    delete: async ({ req }) => {
      const user = req.user

      if (!user) return false
      if (await hasFreshAdminAccess(req as any)) return true

      return false
    },
    read: async ({ req }) => {
      const user = req.user

      if (!user) return false
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
  admin: {
    components: {
      beforeList: ['@/components/CreatorBiographyListRedirect'],
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
    defaultColumns: ['title', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
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
      name: 'profile',
      type: 'relationship',
      relationTo: 'profiles',
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
      name: 'title',
      type: 'text',
      label: 'Título',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Bio',
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [MediaBlock, Content],
              admin: {
                initCollapsed: true,
              },
              required: false,
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [assignOwnership],
  },
}
