import type {
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Payload,
  TextFieldSingleValidation,
} from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { hasEditorialIdentity } from '@/utilities/isEditorialUser'
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
  editorSocialLink?: {
    label?: null | string
    url?: null | string
  } | null
  editorPassword?: null | string
  editorPasswordConfirmation?: null | string
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

function isEditorialProfile(data?: null | Pick<ProfileData, 'editorialProfile' | 'profileType'>) {
  return Boolean(data?.editorialProfile) || isEditorialProfileType(data?.profileType)
}

function isEditorialProfileForAdminCondition(args: {
  siblingData?: null | Pick<ProfileData, 'editorialProfile' | 'profileType'>
  user?: null | {
    editorAccess?: boolean | null
    role?: null | string
    userType?: null | string
  }
}) {
  return hasEditorialIdentity(args.user) || isEditorialProfile(args.siblingData)
}

function getOwnerID(owner: ProfileData['owner']) {
  if (typeof owner === 'string' || typeof owner === 'number') return String(owner)
  if (owner && typeof owner === 'object' && owner.id) return String(owner.id)

  return null
}

async function syncEditorialPassword(args: {
  nextData: ProfileData
  originalDoc?: null | ProfileData
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
}) {
  const password =
    typeof args.nextData.editorPassword === 'string' ? args.nextData.editorPassword.trim() : ''
  const confirmation =
    typeof args.nextData.editorPasswordConfirmation === 'string'
      ? args.nextData.editorPasswordConfirmation.trim()
      : ''

  delete args.nextData.editorPassword
  delete args.nextData.editorPasswordConfirmation

  if (!password && !confirmation) {
    return
  }

  if (!password || !confirmation) {
    throw new Error('Completa ambos campos de contraseña para actualizar el acceso del editor.')
  }

  if (password.length < 8) {
    throw new Error('La nueva contraseña debe tener al menos 8 caracteres.')
  }

  if (password !== confirmation) {
    throw new Error('Las contraseñas no coinciden.')
  }

  const ownerID = getOwnerID(args.nextData.owner) || getOwnerID(args.originalDoc?.owner)

  if (!ownerID) {
    throw new Error('No fue posible identificar la cuenta del editor para actualizar la contraseña.')
  }

  await args.req.payload.update({
    collection: 'users',
    data: {
      password,
    },
    depth: 0,
    id: ownerID,
    overrideAccess: true,
    req: args.req,
    showHiddenFields: true,
  })
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
      editorialProfile: hasEditorialIdentity(owner),
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
  if (isEditorialProfile(nextData)) {
    nextData.accountType = null
    nextData.coverImage = null
    nextData.editorGender = null
    nextData.genre = null
    nextData.location = null
    nextData.mercadoPagoConnection = {}
  } else {
    nextData.accountType = nextData.profileType
    nextData.editorSocialLink = null
    nextData.socialLinks = []
  }

  await syncEditorialPassword({
    nextData,
    originalDoc: (originalDoc || null) as ProfileData | null,
    req,
  })

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
      name: 'editorialIdentity',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/EditorialProfileIdentityField',
        },
        condition: (_data, siblingData, { user }) =>
          isEditorialProfileForAdminCondition({ siblingData, user }),
      },
    },
    {
      name: 'displayName',
      type: 'text',
      label: 'Nombre artístico',
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
      label: 'Tipo de cuenta',
      defaultValue: 'artist',
      admin: {
        condition: (_data, siblingData, { user }) =>
          !isEditorialProfileForAdminCondition({ siblingData, user }),
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
        condition: (_data, siblingData, { user }) =>
          isEditorialProfileForAdminCondition({ siblingData, user }),
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      label: 'Avatar',
      relationTo: 'media',
    },
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Imagen de portada',
      relationTo: 'media',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'location',
      type: 'text',
      label: 'Ubicación',
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
        condition: (_data, siblingData, { user }) =>
          !isEditorialProfileForAdminCondition({ siblingData, user }),
      },
    },
    {
      name: 'genre',
      type: 'text',
      label: 'Género',
      admin: {
        condition: (_data, siblingData, { user }) =>
          !isEditorialProfileForAdminCondition({ siblingData, user }),
      },
    },
    {
      name: 'editorGender',
      type: 'select',
      label: 'Género',
      admin: {
        hidden: true,
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
      label: 'Correo electrónico',
    },
    {
      name: 'editorSocialLink',
      type: 'group',
      label: 'Red social',
      admin: {
        condition: (_data, siblingData, { user }) =>
          isEditorialProfileForAdminCondition({ siblingData, user }),
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'Nombre / máscara',
        },
        {
          name: 'url',
          type: 'text',
          label: 'Enlace',
          validate: (value: null | string | undefined) => {
            if (typeof value !== 'string' || !value.trim()) return true

            try {
              new URL(value)
              return true
            } catch {
              return 'Ingresa una URL válida.'
            }
          },
        },
      ],
    },
    {
      name: 'editorPassword',
      type: 'text',
      virtual: true,
      label: 'Nueva contraseña',
      admin: {
        components: {
          Field: '@/components/ProfilePasswordField',
        },
        condition: (_data, siblingData, { user }) =>
          isEditorialProfileForAdminCondition({ siblingData, user }),
        description: 'Déjala vacía si no quieres cambiar la contraseña del editor.',
      },
      validate: ((value, { siblingData }: any) => {
        if (!isEditorialProfile(siblingData)) return true
        const password = typeof value === 'string' ? value.trim() : ''
        const confirmation =
          typeof siblingData?.editorPasswordConfirmation === 'string'
            ? siblingData.editorPasswordConfirmation.trim()
            : ''

        if (!password && !confirmation) return true
        if (!password || !confirmation) {
          return 'Completa ambos campos de contraseña.'
        }

        return password.length >= 8
          ? true
          : 'La nueva contraseña debe tener al menos 8 caracteres.'
      }) as TextFieldSingleValidation,
    },
    {
      name: 'editorPasswordConfirmation',
      type: 'text',
      virtual: true,
      label: 'Confirmar nueva contraseña',
      admin: {
        components: {
          Field: '@/components/ProfilePasswordField',
        },
        condition: (_data, siblingData, { user }) =>
          isEditorialProfileForAdminCondition({ siblingData, user }),
      },
      validate: ((value, { siblingData }: any) => {
        if (!isEditorialProfile(siblingData)) return true
        const password =
          typeof siblingData?.editorPassword === 'string' ? siblingData.editorPassword.trim() : ''
        const confirmation = typeof value === 'string' ? value.trim() : ''

        if (!password && !confirmation) return true
        if (!password || !confirmation) {
          return 'Completa ambos campos de contraseña.'
        }

        return password === confirmation ? true : 'Las contraseñas no coinciden.'
      }) as TextFieldSingleValidation,
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
      admin: {
        condition: (_data, _siblingData, { user }) => isAdminUser(user),
      },
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
