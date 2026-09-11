import type { CollectionConfig } from 'payload'

import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { payloadDashboardAccess } from '@/access/payloadDashboardAccess'
import { isAdminUser } from '@/utilities/isAdminUser'

export const ConsumerProfiles: CollectionConfig = {
  slug: 'consumerProfiles',
  labels: {
    plural: 'Fans',
    singular: 'Fan',
  },
  indexes: [
    {
      fields: ['owner'],
      unique: true,
    },
    {
      fields: ['email'],
    },
    {
      fields: ['lastPurchaseAt'],
    },
  ],
  access: {
    admin: payloadDashboardAccess,
    create: async ({ req }) => {
      return hasFreshAdminAccess(req as any)
    },
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
    defaultColumns: ['displayName', 'email', 'status', 'lastPurchaseAt', 'updatedAt'],
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
      label: 'Nombre visible',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'avatar',
      type: 'text',
      label: 'Avatar URL',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        {
          label: 'Activa',
          value: 'active',
        },
        {
          label: 'Suspendida',
          value: 'suspended',
        },
      ],
      required: true,
    },
    {
      name: 'lastPurchaseAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'lastCommentAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
  timestamps: true,
}
