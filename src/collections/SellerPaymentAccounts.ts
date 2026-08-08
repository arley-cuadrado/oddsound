import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { assignOwnership } from '@/hooks/assignOwnership'
import { isAdminUser } from '@/utilities/isAdminUser'

export const SellerPaymentAccounts: CollectionConfig = {
  slug: 'seller-payment-accounts',
  labels: {
    plural: 'Cuentas de cobro',
    singular: 'Cuenta de cobro',
  },
  indexes: [
    {
      fields: ['provider', 'profile'],
      unique: true,
    },
  ],
  access: {
    admin: authenticated,
    create: ({ req: { user } }) => Boolean(user),
    delete: async ({ req }) => hasFreshAdminAccess(req as any),
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
    defaultColumns: ['provider', 'accountStatus', 'kycStatus', 'canReceivePayments', 'updatedAt'],
    group: 'Ecommerce',
    useAsTitle: 'providerSellerNickname',
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      access: {
        create: ({ req: { user } }) => Boolean(user),
        read: ({ req: { user } }) => Boolean(user),
        update: ({ req: { user } }) => Boolean(user),
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
        create: ({ req: { user } }) => Boolean(user),
        read: ({ req: { user } }) => Boolean(user),
        update: ({ req: { user } }) => Boolean(user),
      },
      admin: {
        hidden: true,
      },
      required: true,
    },
    {
      name: 'provider',
      type: 'select',
      defaultValue: 'mercadopago',
      options: [
        {
          label: 'Mercado Pago',
          value: 'mercadopago',
        },
      ],
      required: true,
    },
    {
      name: 'accountStatus',
      type: 'select',
      defaultValue: 'disconnected',
      options: [
        { label: 'Disconnected', value: 'disconnected' },
        { label: 'Pending', value: 'pending' },
        { label: 'Connected', value: 'connected' },
        { label: 'Restricted', value: 'restricted' },
        { label: 'Revoked', value: 'revoked' },
      ],
      required: true,
    },
    {
      name: 'kycStatus',
      type: 'select',
      defaultValue: 'unknown',
      options: [
        { label: 'Unknown', value: 'unknown' },
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Restricted', value: 'restricted' },
      ],
      required: true,
    },
    {
      name: 'canReceivePayments',
      type: 'checkbox',
      defaultValue: false,
      label: 'Puede recibir pagos',
    },
    {
      name: 'providerSellerID',
      type: 'text',
      label: 'Provider seller ID',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'providerSellerEmail',
      type: 'email',
      label: 'Correo de la cuenta conectada',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'providerSellerNickname',
      type: 'text',
      label: 'Nombre visible de la cuenta conectada',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'oauthState',
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
      name: 'encryptedAccessToken',
      type: 'textarea',
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
      name: 'encryptedRefreshToken',
      type: 'textarea',
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
      name: 'oauthScope',
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
      name: 'accessTokenExpiresAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'oauthConnectedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
      },
    },
    {
      name: 'oauthRevokedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
      },
    },
    {
      name: 'lastSyncedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
      },
    },
    {
      name: 'lastError',
      type: 'textarea',
      label: 'Último error',
    },
    {
      name: 'shippingOriginDepartment',
      type: 'text',
      label: 'Departamento de despacho',
    },
    {
      name: 'defaultDispatchLeadTimeDays',
      type: 'number',
      defaultValue: 3,
      label: 'Días hábiles estimados de despacho',
      min: 0,
    },
  ],
  hooks: {
    beforeChange: [assignOwnership],
  },
  timestamps: true,
}
