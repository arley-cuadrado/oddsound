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

/**
 * Credentials that must never leave the server. `admin.hidden` only removes the
 * field from the admin UI — the REST and GraphQL APIs still return it to any
 * authenticated reader, and these values decrypt to a seller's Mercado Pago
 * access token.
 */
const serverOnlyFieldAccess = {
  create: () => false,
  read: () => false,
  update: () => false,
}

type ProfileData = {
  accountType?: 'artist' | 'band' | null
  contactEmail?: null | string
  displayName?: null | string
  editorialProfile?: boolean | null
  profileType?: 'artist' | 'band' | 'editorial' | null
  owner?: number | string | { id?: number | string | null } | null
}

type ProfileType = NonNullable<ProfileData['profileType']>

function isEditorialProfileType(profileType?: null | string): profileType is 'editorial' {
  return profileType === 'editorial'
}

function isMusicProfileType(profileType?: null | string): profileType is 'artist' | 'band' {
  return profileType === 'artist' || profileType === 'band'
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

function resolveProfileType(args: {
  accountType?: null | ProfileData['accountType']
  editorialProfile?: boolean | null
  originalDoc?: null | ProfileData
}): ProfileType {
  if (args.editorialProfile) return 'editorial'
  if (args.accountType === 'band') return 'band'
  if (args.accountType === 'artist') return 'artist'
  if (args.originalDoc?.profileType && isMusicProfileType(args.originalDoc.profileType)) {
    return args.originalDoc.profileType
  }

  return 'artist'
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

  nextData.profileType = resolveProfileType({
    accountType: nextData.accountType ?? originalDoc?.accountType ?? null,
    editorialProfile: resolved.editorialProfile,
    originalDoc: (originalDoc || null) as ProfileData | null,
  })

  // Group fields are cleared with an empty object, never null: Payload walks
  // their subfields during validation and a null sibling throws before any
  // profile can be written.
  if (isEditorialProfileType(nextData.profileType)) {
    nextData.accountType = null
    nextData.coverImage = null
    nextData.genre = null
    nextData.location = null
    nextData.mercadoPagoConnection = {}
    nextData.socialLinks = []
  } else {
    nextData.accountType = nextData.profileType
    nextData.editorGender = null
    nextData.editorSocials = {}
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
    profileType: resolveProfileType({
      accountType: (doc as ProfileData).accountType ?? null,
      editorialProfile: resolved.editorialProfile,
      originalDoc: doc as ProfileData,
    }),
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
      name: 'profileType',
      type: 'select',
      defaultValue: 'artist',
      access: {
        create: ({ req: { user } }) => isAdminUser(user),
        read: ({ req: { user } }) => isAdminUser(user),
        update: ({ req: { user } }) => isAdminUser(user),
      },
      admin: {
        hidden: true,
      },
      options: [
        {
          label: 'Artist',
          value: 'artist',
        },
        {
          label: 'Band',
          value: 'band',
        },
        {
          label: 'Editorial',
          value: 'editorial',
        },
      ],
    },
    {
      name: 'accountType',
      type: 'select',
      defaultValue: 'artist',
      admin: {
        condition: (_data, siblingData) => !isEditorialProfileType(siblingData?.profileType),
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
        if (isEditorialProfileType(siblingData?.profileType)) return true

        return value ? true : 'El tipo de cuenta es obligatorio para perfiles de artistas o bandas.'
      }) as any,
    },
    {
      name: 'bio',
      type: 'textarea',
      admin: {
        condition: (_data, siblingData) => isEditorialProfileType(siblingData?.profileType),
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
        condition: (_data, siblingData) => !isEditorialProfileType(siblingData?.profileType),
      },
    },
    {
      name: 'location',
      type: 'text',
      validate: ((value, options) => {
        const siblingData = (options as { siblingData?: { profileType?: ProfileType | null } })
          .siblingData

        if (isEditorialProfileType(siblingData?.profileType)) return true
        if (options.req.user?.role !== 'creator') return true
        if (options.operation === 'create') return true

        return typeof value === 'string' && value.trim().length > 0
          ? true
          : 'El país es obligatorio para creadores.'
      }) as TextFieldSingleValidation,
      admin: {
        condition: (_data, siblingData) => !isEditorialProfileType(siblingData?.profileType),
      },
    },
    {
      name: 'genre',
      type: 'text',
      admin: {
        condition: (_data, siblingData) => !isEditorialProfileType(siblingData?.profileType),
      },
    },
    {
      name: 'editorGender',
      type: 'select',
      label: 'Género',
      admin: {
        condition: (_data, siblingData) => isEditorialProfileType(siblingData?.profileType),
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
      validate: ((value: string | null | undefined, { siblingData }: any) => {
        if (!isEditorialProfileType(siblingData?.profileType)) return true

        return value ? true : 'El genero del editor es obligatorio.'
      }) as any,
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'editorSocials',
      type: 'group',
      label: 'Redes sociales',
      admin: {
        condition: (_data, siblingData) => isEditorialProfileType(siblingData?.profileType),
        description: 'Registra al menos una red social para el perfil editorial.',
      },
      validate: ((value: Record<string, unknown> | null | undefined, { siblingData }: any) => {
        if (!isEditorialProfileType(siblingData?.profileType)) return true

        const hasAtLeastOneValue = Object.values(value || {}).some(
          (item) => typeof item === 'string' && item.trim().length > 0,
        )

        return hasAtLeastOneValue
          ? true
          : 'Debes registrar al menos una red social del editor.'
      }) as any,
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
          access: serverOnlyFieldAccess,
        },
        {
          name: 'encryptedAccessToken',
          type: 'textarea',
          access: serverOnlyFieldAccess,
        },
        {
          name: 'encryptedRefreshToken',
          type: 'textarea',
          access: serverOnlyFieldAccess,
        },
        {
          // Kept for exactly one rotation. Mercado Pago hands back a new refresh
          // token every time we renew, so if the API call lands but the write
          // does not, the previous one is the only way back in.
          name: 'previousEncryptedRefreshToken',
          type: 'textarea',
          access: serverOnlyFieldAccess,
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
          name: 'lastRefreshedAt',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'lastRefreshAttemptAt',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'refreshFailureCount',
          type: 'number',
          defaultValue: 0,
          min: 0,
        },
        {
          // Held while one process renews, so two simultaneous checkouts cannot
          // both spend the same single-use refresh token.
          name: 'refreshLockedAt',
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
    {
      name: 'commerce',
      type: 'group',
      label: 'Tienda',
      fields: [
        {
          name: 'shippingFlatRateCOP',
          type: 'number',
          label: 'Costo de envío (COP)',
          defaultValue: 0,
          min: 0,
          admin: {
            description: 'Una por pedido, no por producto. 0 = envío gratis.',
            step: 1000,
          },
        },
        {
          name: 'shippingNotes',
          type: 'textarea',
          label: 'Cobertura y tiempos de entrega',
          admin: {
            description: 'Ej: "Toda Colombia, 3 a 5 días hábiles."',
          },
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
