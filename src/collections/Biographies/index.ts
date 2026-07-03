import type { CollectionConfig, Field } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { assignOwnership } from '@/hooks/assignOwnership'
import { BiographyContent } from '@/blocks/Content/config'
import { socialLinksField } from '@/fields/socialLinks'
import { isAdminUser } from '@/utilities/isAdminUser'

const biographyHero: Field = {
  name: 'hero',
  type: 'group',
  label: false,
  fields: [
    {
      name: 'type',
      type: 'select',
      defaultValue: 'mediumImpact',
      label: 'Tipo',
      options: [
        {
          label: 'Dividido',
          value: 'mediumImpact',
        },
      ],
      admin: {
        readOnly: true,
      },
      required: true,
    },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Opcional. Si agregas una imagen, la biografía mostrará el encabezado dividido.',
      },
      required: false,
    },
  ],
}

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
          label: 'Encabezado',
          fields: [biographyHero],
        },
        {
          label: 'Bio',
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              label: 'Contenido',
              blocks: [BiographyContent],
              admin: {
                initCollapsed: true,
              },
              required: false,
            },
          ],
        },
      ],
    },
    {
      ...socialLinksField(),
      admin: {
        hidden: true,
      },
    },
  ],
  hooks: {
    beforeChange: [assignOwnership],
  },
}
