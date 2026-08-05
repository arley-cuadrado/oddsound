import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { assignOwnership } from '@/hooks/assignOwnership'
import { isAdminUser } from '@/utilities/isAdminUser'

type OverrideArgs = {
  defaultCollection: CollectionConfig
}

const canManageOwnedProducts: CollectionConfig['access'] = {
  admin: authenticated,
  create: ({ req: { user } }) => Boolean(user),
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
}

export function extendEcommerceProductsCollection({ defaultCollection }: OverrideArgs): CollectionConfig {
  return {
    ...defaultCollection,
    access: canManageOwnedProducts,
    admin: {
      ...(defaultCollection.admin || {}),
      defaultColumns: ['title', 'priceInUSD', 'inventory', 'updatedAt'],
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
        label: 'Title',
        required: true,
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
      },
      {
        name: 'coverImage',
        type: 'upload',
        label: 'Cover image',
        relationTo: 'media',
      },
      ...defaultCollection.fields,
      slugField({
        useAsSlug: 'title',
      }),
    ],
    hooks: {
      ...defaultCollection.hooks,
      beforeChange: [...(defaultCollection.hooks?.beforeChange || []), assignOwnership],
    },
  }
}
