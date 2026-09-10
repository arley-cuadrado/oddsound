import type { CollectionConfig, Field, PayloadRequest } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { assignOwnership } from '@/hooks/assignOwnership'
import { BiographyContent } from '@/blocks/Content/config'
import {
  revalidateBiography,
  revalidateBiographyDelete,
} from '@/collections/Biographies/hooks/revalidateBiography'
import { socialLinksField } from '@/fields/socialLinks'
import { isAdminUser } from '@/utilities/isAdminUser'
import { isMusicalCreatorUser } from '@/utilities/isEditorialUser'

async function canCreateBiographyForRequest(req: PayloadRequest) {
  const user = req.user

  if (!user) return false
  if (await hasFreshAdminAccess(req as any)) return true
  if (!isMusicalCreatorUser(user)) return false

  const existingBiography = await req.payload.find({
    collection: 'biographies',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      owner: {
        equals: user.id,
      },
    },
  })

  return existingBiography.docs.length === 0
}

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
        hidden: true,
        readOnly: true,
      },
      required: true,
    },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Opcional. Si agregas una imagen, la biografía mostrará el encabezado dividido.',
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
    create: async ({ req }) => canCreateBiographyForRequest(req),
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
      if (!isMusicalCreatorUser(user)) return false

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
      if (!isMusicalCreatorUser(user)) return false

      return {
        owner: {
          equals: user.id,
        },
      }
    },
  },
  admin: {
    // Artist and band settings now live in Dashboard > Cuenta. Admins retain the
    // collection for support and editorial oversight.
    hidden: ({ user }) => !isAdminUser(user),
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
              labels: {
                plural: 'Secciones',
                singular: 'Sección',
              },
              blocks: [BiographyContent],
              defaultValue: [
                {
                  blockType: 'content',
                  columns: [
                    {
                      size: 'full',
                      richText: {
                        root: {
                          type: 'root',
                          children: [],
                          direction: null,
                          format: '',
                          indent: 0,
                          version: 1,
                        },
                      },
                    },
                  ],
                },
              ],
              admin: {
                initCollapsed: true,
              },
              required: false,
            },
          ],
        },
        {
          label: 'Redes sociales',
          fields: [socialLinksField()],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [assignOwnership],
    afterChange: [revalidateBiography],
    afterDelete: [revalidateBiographyDelete],
  },
}
