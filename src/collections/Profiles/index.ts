import type {
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Payload,
  TextFieldSingleValidation,
} from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { isAdminUser } from '@/utilities/isAdminUser'
import { slugField } from 'payload'

type ProfileData = {
  accountType?: 'artist' | 'band' | null
  contactEmail?: null | string
  displayName?: null | string
  editorialProfile?: boolean | null
  owner?: number | string | { id?: number | string | null } | null
}

function getOwnerID(owner: ProfileData['owner']) {
  if (typeof owner === 'string' || typeof owner === 'number') return String(owner)
  if (owner && typeof owner === 'object' && owner.id) return String(owner.id)

  return null
}

async function resolveEditorialProfileData(args: {
  data?: null | ProfileData
  originalDoc?: null | ProfileData
  payload: Payload
}) {
  const ownerID = getOwnerID(args.data?.owner) || getOwnerID(args.originalDoc?.owner)

  if (!ownerID) {
    return {
      contactEmail: args.data?.contactEmail ?? args.originalDoc?.contactEmail ?? null,
      displayName: args.data?.displayName ?? args.originalDoc?.displayName ?? null,
      editorialProfile: Boolean(args.data?.editorialProfile ?? args.originalDoc?.editorialProfile),
    }
  }

  try {
    const owner = await args.payload.findByID({
      collection: 'users',
      id: ownerID,
      depth: 0,
      overrideAccess: true,
    })

    return {
      contactEmail:
        args.data?.contactEmail ??
        args.originalDoc?.contactEmail ??
        owner?.email ??
        null,
      displayName:
        args.data?.displayName ??
        args.originalDoc?.displayName ??
        owner?.name ??
        null,
      editorialProfile: Boolean(owner?.editorAccess),
    }
  } catch {
    return {
      contactEmail: args.data?.contactEmail ?? args.originalDoc?.contactEmail ?? null,
      displayName: args.data?.displayName ?? args.originalDoc?.displayName ?? null,
      editorialProfile: Boolean(args.data?.editorialProfile ?? args.originalDoc?.editorialProfile),
    }
  }
}

const syncEditorialProfileState: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const nextData = { ...(data || {}) }
  const resolved = await resolveEditorialProfileData({
    data: nextData,
    originalDoc: (originalDoc || null) as ProfileData | null,
    payload: req.payload,
  })

  nextData.editorialProfile = resolved.editorialProfile

  if (resolved.displayName && !nextData.displayName) {
    nextData.displayName = resolved.displayName
  }

  if (resolved.contactEmail && !nextData.contactEmail) {
    nextData.contactEmail = resolved.contactEmail
  }

  if (resolved.editorialProfile) {
    nextData.accountType = null
  } else if (!nextData.accountType && originalDoc?.accountType) {
    nextData.accountType = originalDoc.accountType
  }

  return nextData
}

const populateEditorialProfileState: CollectionAfterReadHook = async ({ doc, req }) => {
  if (!doc || typeof doc !== 'object') return doc

  const resolved = await resolveEditorialProfileData({
    data: doc as ProfileData,
    originalDoc: doc as ProfileData,
    payload: req.payload,
  })

  return {
    ...doc,
    editorialProfile: resolved.editorialProfile,
  }
}

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
    defaultColumns: ['displayName', 'slug', 'updatedAt'],
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
      name: 'editorialProfile',
      type: 'checkbox',
      defaultValue: false,
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
      name: 'accountType',
      type: 'select',
      defaultValue: 'artist',
      admin: {
        condition: (_data, siblingData) => !Boolean(siblingData?.editorialProfile),
      },
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
      validate: ((value: string | null | undefined, { siblingData }: any) => {
        if (siblingData?.editorialProfile) return true

        return value ? true : 'El tipo de cuenta es obligatorio para perfiles de artistas o bandas.'
      }) as any,
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
        const siblingData = (options as { siblingData?: { editorialProfile?: boolean | null } })
          .siblingData

        if (siblingData?.editorialProfile) return true
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
      name: 'editorGender',
      type: 'select',
      label: 'Género editorial',
      admin: {
        condition: (_data, siblingData) => Boolean(siblingData?.editorialProfile),
      },
      options: [
        {
          label: 'Hombre',
          value: 'male',
        },
        {
          label: 'Mujer',
          value: 'female',
        },
        {
          label: 'Indeterminado',
          value: 'indeterminate',
        },
      ],
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'editorSocials',
      type: 'group',
      label: 'Redes sociales del editor',
      admin: {
        condition: (_data, siblingData) => Boolean(siblingData?.editorialProfile),
      },
      fields: [
        {
          name: 'instagram',
          type: 'text',
          label: 'Instagram',
        },
        {
          name: 'x',
          type: 'text',
          label: 'X',
        },
        {
          name: 'threads',
          type: 'text',
          label: 'Threads',
        },
        {
          name: 'facebook',
          type: 'text',
          label: 'Facebook',
        },
      ],
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
  hooks: {
    beforeChange: [syncEditorialProfileState],
    afterRead: [populateEditorialProfileState],
  },
}
