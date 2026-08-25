import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { isAdmin } from '@/access/isAdmin'
import { isAdminOrSelf } from '@/access/isAdminOrSelf'
import { payloadDashboardAccess } from '@/access/payloadDashboardAccess'
import { USERS_LOGIN_LOCK_TIME_MS, USERS_MAX_LOGIN_ATTEMPTS } from '@/utilities/authLocking'
import { isAdminUser } from '@/utilities/isAdminUser'
import { isConfiguredSuperAdminEmail, isSuperAdminUser } from '@/utilities/isSuperAdminUser'
import {
  CREATOR_RESET_PASSWORD_EXPIRATION_MS,
  generateCreatorResetPasswordEmailHTML,
  generateCreatorResetPasswordEmailSubject,
  generateEditorVerificationEmailHTML,
  generateEditorVerificationEmailSubject,
  generateCreatorVerificationEmailHTML,
  generateCreatorVerificationEmailSubject,
} from '@/utilities/emailVerification'
import { createProfile } from './hooks/createProfile'
import { deleteCreatorData } from './hooks/deleteCreatorData'
import { ensureCreatorDefaults } from './hooks/ensureCreatorDefaults'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: payloadDashboardAccess,
    create: isAdmin,
    delete: async ({ req }) => {
      const user = req.user

      if (!user) return false
      if (!(await hasFreshAdminAccess(req as any))) return false

      // Admins can delete creator accounts, but never themselves or any admin account.
      return {
        and: [
          {
            role: {
              equals: 'creator',
            },
          },
          {
            id: {
              not_equals: user?.id,
            },
          },
        ],
      } as any
    },
    read: isAdminOrSelf,
    update: isAdminOrSelf,
  },
  admin: {
    components: {
      beforeList: ['@/components/UsersListSelectionGuard', '@/components/CreateRedactorButton'],
    },
    defaultColumns: ['name', 'username', 'email', 'userType', 'role'],
    hidden: ({ user }) => !isAdminUser(user as { role?: null | string } | null | undefined),
    useAsTitle: 'name',
  },
  auth: {
    lockTime: USERS_LOGIN_LOCK_TIME_MS,
    maxLoginAttempts: USERS_MAX_LOGIN_ATTEMPTS,
    forgotPassword: {
      expiration: CREATOR_RESET_PASSWORD_EXPIRATION_MS,
      generateEmailHTML: (args) =>
        generateCreatorResetPasswordEmailHTML({
          token: args?.token || '',
          user: {
            email: args?.user?.email || '',
            name: args?.user?.name || null,
          },
        }),
      generateEmailSubject: generateCreatorResetPasswordEmailSubject,
    },
    verify: {
      generateEmailHTML: ({ token, user }) =>
        user?.editorAccess
          ? generateEditorVerificationEmailHTML({
              token,
              user,
            })
          : generateCreatorVerificationEmailHTML({
              token,
              user,
            }),
      generateEmailSubject: ({ user }) =>
        user?.editorAccess
          ? generateEditorVerificationEmailSubject()
          : generateCreatorVerificationEmailSubject(),
    },
  },
  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      access: {
        update: async ({ req, data, siblingData }) => {
          const user = req.user
          
          if (!user) return false
          if (await hasFreshAdminAccess(req as any)) return true
          
          // Creators can only update their own name
          return data?.id === user.id || siblingData?.id === user.id
        },
      },
    },
    {
      name: 'username',
      type: 'text',
      label: 'Nombre de usuario',
      index: true,
      required: true,
      unique: true,
      access: {
        update: async ({ req, data, siblingData }) => {
          const user = req.user

          if (!user) return false
          if (await hasFreshAdminAccess(req as any)) return true

          return data?.id === user.id || siblingData?.id === user.id
        },
      },
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'creator',
      admin: {
        condition: (_data, siblingData, { user }) => {
          const isSuperAdmin = isSuperAdminUser(user as { email?: null | string; role?: null | string } | null | undefined)
          
          // Only superadmin can see role field
          return isSuperAdmin && siblingData?.role !== 'admin'
        },
      },
      label: 'Rol',
      access: {
        update: async ({ req }) => {
          // Only superadmin can update roles
          return isSuperAdminUser(req.user as { email?: null | string; role?: null | string } | null | undefined)
        },
      },
      options: [
        {
          label: 'Administrador',
          value: 'admin',
        },
        {
          label: 'Creador',
          value: 'creator',
        },
      ],
      required: true,
    },
    {
      name: 'adminRoleLabel',
      type: 'text',
      virtual: true,
      defaultValue: 'Administrador',
      admin: {
        condition: (_data, siblingData, { user }) =>
          isAdminUser(user as { role?: null | string } | null | undefined) &&
          !isConfiguredSuperAdminEmail(siblingData?.email) &&
          siblingData?.role === 'admin',
        description: 'Esta cuenta es administrativa y no puede cambiarse a creador.',
        readOnly: true,
      },
      label: 'Rol',
    },
    {
      name: 'superAdminRoleLabel',
      type: 'text',
      virtual: true,
      defaultValue: 'Superadministrador',
      admin: {
        condition: (data, siblingData, { user }) =>
          isAdminUser(user as { role?: null | string } | null | undefined) &&
          isConfiguredSuperAdminEmail(data?.email) &&
          siblingData?.role === 'admin',
        description: 'Esta cuenta es la única superadministradora y puede crear otras cuentas administrativas.',
        readOnly: true,
      },
      label: 'Rol',
    },
    {
      name: 'editorAccess',
      type: 'checkbox',
      defaultValue: false,
      label: 'Cuenta de redactor',
      admin: {
        components: {
          Field: '@/components/UsersEditorAccessField',
        },
        description:
          'Identifica cuentas editoriales creadas por admin para publicar articulos.',
      },
    },
    {
      name: 'userType',
      type: 'select',
      defaultValue: 'creator',
      label: 'Tipo de usuario',
      admin: {
        condition: (_data, siblingData, { user }) => {
          const isAdmin = isAdminUser(user as { role?: null | string } | null | undefined)
          if (!isAdmin) return false
          if (siblingData?.role === 'admin') return false

          return true
        },
      },
      access: {
        update: async ({ req }) => {
          return await hasFreshAdminAccess(req as any)
        },
      },
      options: [
        {
          label: 'Creador',
          value: 'creator',
        },
        {
          label: 'Fan',
          value: 'fan',
        },
      ],
      required: true,
    },
    {
      name: 'accountType',
      type: 'select',
      defaultValue: 'artist',
      label: 'Tipo de cuenta',
      admin: {
        components: {
          Field: '@/components/UsersAccountTypeField',
        },
        condition: (_data, siblingData, { user }) => {
          const isAdmin = isAdminUser(user as { role?: null | string } | null | undefined)
          if (!isAdmin || siblingData?.role === 'admin') return false
          if (siblingData?.editorAccess) return false
          if (siblingData?.userType === 'consumer' || siblingData?.userType === 'fan') return false

          return true
        },
      },
      access: {
        update: async ({ req }) => {
          // Only admins can update account type
          return await hasFreshAdminAccess(req as any)
        },
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
        if (siblingData?.editorAccess) return true
        if (siblingData?.userType === 'consumer' || siblingData?.userType === 'fan') return true

        return value ? true : 'El tipo de cuenta es obligatorio para cuentas de artista o banda.'
      }) as any,
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
      name: 'consumerProfile',
      type: 'relationship',
      relationTo: 'consumerProfiles',
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
      name: 'authProvider',
      type: 'select',
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
          label: 'Google',
          value: 'google',
        },
      ],
    },
    {
      name: 'googleSubjectId',
      type: 'text',
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
      name: 'avatar',
      type: 'text',
      access: {
        create: ({ req: { user } }) => isAdminUser(user),
        read: ({ req: { user } }) => isAdminUser(user),
        update: ({ req: { user } }) => isAdminUser(user),
      },
      admin: {
        hidden: true,
      },
      label: 'Avatar URL',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Está activa',
      admin: {
        condition: (_data, _siblingData, { user }) =>
          isAdminUser(user as { role?: null | string } | null | undefined),
      },
      access: {
        update: async ({ req }) => {
          // Only admins can update isActive status
          return await hasFreshAdminAccess(req as any)
        },
      },
    },
    {
      name: 'legalAccepted',
      type: 'checkbox',
      admin: {
        condition: (_data, _siblingData, { user }) =>
          isAdminUser(user as { role?: null | string } | null | undefined),
        description: 'Indica si el usuario aceptó los términos legales durante el registro.',
        position: 'sidebar',
        readOnly: true,
      },
      defaultValue: false,
    },
    {
      name: 'legalAcceptedAt',
      type: 'date',
      admin: {
        condition: (_data, _siblingData, { user }) =>
          isAdminUser(user as { role?: null | string } | null | undefined),
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'legalAcceptedVersion',
      type: 'text',
      admin: {
        condition: (_data, _siblingData, { user }) =>
          isAdminUser(user as { role?: null | string } | null | undefined),
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  hooks: {
    afterDelete: [deleteCreatorData],
    afterOperation: [createProfile],
    beforeChange: [ensureCreatorDefaults],
  },
  timestamps: true,
}
