import type { Access, CollectionConfig } from 'payload'

import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { payloadDashboardAccess } from '@/access/payloadDashboardAccess'
import { isFanUser } from '@/utilities/isEditorialUser'
import { isAdminUser } from '@/utilities/isAdminUser'
import { resolveUserProfileID } from '@/utilities/userRelations'

const canCreateComment: Access = ({ req }) => {
  const user = req.user

  if (!user) return false

  return isFanUser(user)
}

const canReadComments: Access = async ({ req }) => {
  const user = req.user
  const approvedFilter = {
    status: {
      equals: 'approved',
    },
  }

  if (!user) return approvedFilter as any
  if (await hasFreshAdminAccess(req as any)) return true

  if (isFanUser(user)) {
    return {
      or: [
        approvedFilter,
        {
          authorUser: {
            equals: user.id,
          },
        },
      ],
    } as any
  }

  const creatorProfileID = resolveUserProfileID(user)

  if (user.role === 'creator' && creatorProfileID) {
    return {
      or: [
        approvedFilter,
        {
          artistProfile: {
            equals: creatorProfileID,
          },
        },
      ],
    } as any
  }

  return approvedFilter as any
}

const canModerateComment: Access = async ({ req }) => {
  const user = req.user

  if (!user) return false
  if (await hasFreshAdminAccess(req as any)) return true

  const creatorProfileID = resolveUserProfileID(user)

  if (user.role === 'creator' && creatorProfileID) {
    return {
      artistProfile: {
        equals: creatorProfileID,
      },
    } as any
  }

  return false
}

export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: {
    plural: 'Comentarios',
    singular: 'Comentario',
  },
  indexes: [
    {
      fields: ['release', 'status', 'createdAt'],
    },
    {
      fields: ['post', 'status', 'createdAt'],
    },
    {
      fields: ['artistProfile', 'status', 'createdAt'],
    },
    {
      fields: ['consumerProfile', 'createdAt'],
    },
    {
      fields: ['authorUser', 'createdAt'],
    },
  ],
  access: {
    admin: payloadDashboardAccess,
    create: canCreateComment,
    delete: canModerateComment,
    read: canReadComments,
    update: canModerateComment,
  },
  admin: {
    components: {
      beforeList: ['@/components/CommentsListEmptyStateGuard'],
    },
    defaultColumns: ['source', 'release', 'post', 'status', 'purchaseVerified', 'createdAt'],
    hidden: ({ user }) => !user || isFanUser(user),
    useAsTitle: 'content',
  },
  fields: [
    {
      name: 'authorUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: {
        create: ({ req: { user } }) => Boolean(user),
        read: ({ req: { user } }) => Boolean(user),
        update: ({ req: { user } }) => isAdminUser(user),
      },
      admin: {
        hidden: true,
      },
    },
    {
      name: 'consumerProfile',
      type: 'relationship',
      relationTo: 'consumerProfiles',
      required: true,
      access: {
        create: ({ req: { user } }) => Boolean(user),
        read: ({ req: { user } }) => Boolean(user),
        update: ({ req: { user } }) => isAdminUser(user),
      },
      admin: {
        hidden: true,
      },
    },
    {
      name: 'release',
      type: 'relationship',
      relationTo: 'pages',
      validate: (value: any, { siblingData }: { siblingData?: { post?: any } }) => {
        if (value || siblingData?.post) return true
        return 'Debes asociar el comentario a un lanzamiento o a un artículo.'
      },
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      validate: (value: any, { siblingData }: { siblingData?: { release?: any } }) => {
        if (value || siblingData?.release) return true
        return 'Debes asociar el comentario a un artículo o a un lanzamiento.'
      },
    },
    {
      name: 'artistProfile',
      type: 'relationship',
      relationTo: 'profiles',
      required: true,
    },
    {
      name: 'content',
      type: 'textarea',
      label: 'Comentario',
      required: true,
      validate: (value: null | string | undefined) => {
        if (typeof value !== 'string' || value.trim().length < 3) {
          return 'Escribe un comentario de al menos 3 caracteres.'
        }

        if (value.trim().length > 1000) {
          return 'El comentario no puede superar los 1000 caracteres.'
        }

        return true
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        {
          label: 'Pendiente',
          value: 'pending',
        },
        {
          label: 'Aprobado',
          value: 'approved',
        },
        {
          label: 'Rechazado',
          value: 'rejected',
        },
      ],
      required: true,
    },
    {
      name: 'purchaseVerified',
      type: 'checkbox',
      defaultValue: false,
      label: 'Comprador verificado',
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'release-public',
      options: [
        {
          label: 'Release público',
          value: 'release-public',
        },
        {
          label: 'Artículo público',
          value: 'article-public',
        },
      ],
      required: true,
    },
    {
      name: 'moderatedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'moderatedBy',
      type: 'relationship',
      relationTo: 'users',
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation !== 'update') return data
        if (!data || typeof data !== 'object') return data

        const nextData = { ...data }

        if ('status' in nextData) {
          nextData.moderatedAt = new Date().toISOString()
          nextData.moderatedBy = req.user?.id
        }

        return nextData
      },
    ],
  },
  timestamps: true,
}
