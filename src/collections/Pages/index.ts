import type { CollectionConfig } from 'payload'

import { assignOwnership } from '@/hooks/assignOwnership'
import { generateCreatorContentSlug } from '@/hooks/generateCreatorContentSlug'
import { isAdminUser } from '@/utilities/isAdminUser'
import { isSuperAdminUser } from '@/utilities/isSuperAdminUser'
import { authenticated } from '../../access/authenticated'
import { Archive } from '../../blocks/ArchiveBlock/config'
import { CallToAction } from '../../blocks/CallToAction/config'
import { Content } from '../../blocks/Content/config'
import { Events } from '../../blocks/Events/config'
import { FormBlock } from '../../blocks/Form/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { SocialMediaBlock } from '../../blocks/SocialMediaBlock/config'
import { SpotifyBlock } from '../../blocks/SpotifyBlock/config'
import { VideoBlock } from '../../blocks/VideoBlock/config'
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
      if (!user) {
        return {
          _status: {
            equals: 'published',
          },
        } as any
      }
      if (isAdminUser(user)) return true

      return {
        owner: {
          equals: user.id,
        },
      } as any
    },
    readVersions: ({ req: { user } }) => isSuperAdminUser(user),
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
        create: ({ req: { user } }) => isAdminUser(user),
        read: ({ req: { user } }) => isAdminUser(user),
        update: ({ req: { user } }) => isAdminUser(user),
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
        create: ({ req: { user } }) => isAdminUser(user),
        read: ({ req: { user } }) => isAdminUser(user),
        update: ({ req: { user } }) => isAdminUser(user),
      },
      admin: {
        hidden: true,
        position: 'sidebar',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [hero],
          label: 'Hero',
        },
        {
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [
                CallToAction,
                Content,
                Events,
                MediaBlock,
                SocialMediaBlock,
                SpotifyBlock,
                VideoBlock,
                Archive,
                FormBlock,
              ],
              required: true,
              admin: {
                initCollapsed: true,
              },
            },
          ],
          label: 'Content',
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
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
