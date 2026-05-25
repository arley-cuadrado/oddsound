import type { CollectionConfig } from 'payload'

import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { assignOwnership } from '@/hooks/assignOwnership'
import { generateCreatorContentSlug } from '@/hooks/generateCreatorContentSlug'
import { isAdminUser } from '@/utilities/isAdminUser'
import { isSuperAdminUser } from '@/utilities/isSuperAdminUser'
import { editorialBlocks } from '../shared/editorialBlocks'
import { authenticated } from '../../access/authenticated'
import { hero } from '@/heros/config'
import { slugField } from 'payload'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  labels: {
    plural: 'Lanzamientos',
    singular: 'Lanzamiento',
  },
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

      if (!user) {
        return {
          _status: {
            equals: 'published',
          },
        } as any
      }
      if (await hasFreshAdminAccess(req as any)) return true

      return {
        owner: {
          equals: user.id,
        },
      } as any
    },
    readVersions: ({ req: { user } }) => isSuperAdminUser(user),
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
  // This config controls what's populated by default when a page is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'pages'>
  defaultPopulate: {
    title: true,
    slug: true,
  },
  admin: {
    components: {
      views: {
        edit: {
          api: {
            tab: {
              condition: ({ req }) => isSuperAdminUser(req.user),
            },
          },
          versions: {
            tab: {
              condition: ({ req }) => isSuperAdminUser(req.user),
            },
          },
        },
      },
    },
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'pages',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'pages',
        req,
      }),
    useAsTitle: 'title',
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
        position: 'sidebar',
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
        position: 'sidebar',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Título',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [hero],
          label: 'Encabezado',
        },
        {
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: editorialBlocks,
              required: true,
              admin: {
                initCollapsed: true,
              },
            },
          ],
          label: 'Contenido',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Fecha de publicación',
      admin: {
        position: 'sidebar',
      },
    },
    slugField(),
  ],
  hooks: {
    afterChange: [revalidatePage],
    beforeChange: [assignOwnership, generateCreatorContentSlug('pages'), populatePublishedAt],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
