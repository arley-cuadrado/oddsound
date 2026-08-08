import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/access/isAdmin'
import { isAdminUser } from '@/utilities/isAdminUser'

export const MarketplaceSettings: GlobalConfig = {
  slug: 'marketplace-settings',
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  admin: {
    hidden: ({ user }) => !isAdminUser(user),
  },
  fields: [
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
      name: 'platformFeePercent',
      type: 'number',
      defaultValue: 10,
      min: 0,
      max: 100,
      required: true,
      label: 'Comisión fija de Oddsound (%)',
    },
    {
      name: 'checkoutCurrencyCode',
      type: 'select',
      defaultValue: 'COP',
      options: [
        {
          label: 'COP',
          value: 'COP',
        },
      ],
      required: true,
    },
    {
      name: 'usdToCopRate',
      type: 'number',
      defaultValue: 4000,
      min: 1,
      required: true,
      label: 'Tasa interna USD -> COP',
    },
    {
      name: 'webhookAuthToken',
      type: 'text',
      label: 'Webhook auth token',
      admin: {
        description:
          'Se agrega como token de verificación en la URL de notificación para validar los webhooks de Mercado Pago.',
      },
    },
    {
      name: 'shippingZones',
      type: 'array',
      label: 'Zonas de envío',
      fields: [
        {
          name: 'code',
          type: 'text',
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'stateKeywords',
          type: 'array',
          label: 'Departamentos / estados incluidos',
          fields: [
            {
              name: 'value',
              type: 'text',
              required: true,
            },
          ],
          minRows: 1,
        },
        {
          name: 'baseRateCOP',
          type: 'number',
          min: 0,
          required: true,
          label: 'Tarifa base COP',
        },
        {
          name: 'additionalKgRateCOP',
          type: 'number',
          min: 0,
          required: true,
          label: 'Recargo por kg COP',
          defaultValue: 0,
        },
        {
          name: 'estimatedBusinessDays',
          type: 'number',
          min: 0,
          defaultValue: 3,
          required: true,
          label: 'Días hábiles estimados',
        },
        {
          name: 'freeShippingThresholdCOP',
          type: 'number',
          min: 0,
          label: 'Envío gratis desde COP',
        },
      ],
    },
  ],
}
