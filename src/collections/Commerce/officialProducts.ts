import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { assignOwnership } from '@/hooks/assignOwnership'
import { isAdminUser } from '@/utilities/isAdminUser'

type OverrideArgs = {
  defaultCollection: CollectionConfig
}

function validateExternalCheckoutURL(
  value: null | string | undefined,
  { siblingData }: { siblingData?: { checkoutProvider?: null | string } },
) {
  if (siblingData?.checkoutProvider !== 'other') return true
  if (typeof value !== 'string' || !value.trim()) {
    return 'La URL de compra externa es obligatoria.'
  }

  try {
    new URL(value)
    return true
  } catch {
    return 'Ingresa una URL valida para el checkout externo.'
  }
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
  const defaultVersions =
    defaultCollection.versions && typeof defaultCollection.versions === 'object'
      ? defaultCollection.versions
      : undefined
  const defaultDrafts =
    defaultVersions?.drafts && typeof defaultVersions.drafts === 'object'
      ? defaultVersions.drafts
      : undefined

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
          read: ({ req: { user } }) => Boolean(user),
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
          read: ({ req: { user } }) => Boolean(user),
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
        label: 'Descripcion',
      },
      {
        name: 'productType',
        type: 'select',
        label: 'Tipo de producto',
        defaultValue: 'physical',
        options: [
          {
            label: 'Fisico',
            value: 'physical',
          },
          {
            label: 'Digital',
            value: 'digital',
          },
        ],
        required: true,
      },
      {
        name: 'requiresShipping',
        type: 'checkbox',
        label: 'Requiere envio',
        defaultValue: true,
        admin: {
          condition: (_data, siblingData) => siblingData?.productType !== 'digital',
        },
      },
      {
        name: 'weightInGrams',
        type: 'number',
        label: 'Peso (gramos)',
        min: 0,
        admin: {
          condition: (_data, siblingData) => siblingData?.productType !== 'digital',
          description: 'Se usa para el calculo interno de envios por zonas.',
        },
      },
      {
        name: 'coverImage',
        type: 'upload',
        label: 'Imagen de portada',
        relationTo: 'media',
      },
      {
        name: 'images',
        type: 'array',
        label: 'Galeria',
        admin: {
          description: 'La primera imagen puede reutilizarse luego en la vitrina publica del producto.',
          initCollapsed: true,
        },
        fields: [
          {
            name: 'image',
            type: 'upload',
            label: 'Imagen',
            relationTo: 'media',
            required: true,
          },
        ],
      },
      {
        name: 'release',
        type: 'relationship',
        label: 'Lanzamiento relacionado',
        relationTo: 'pages',
      },
      {
        name: 'checkoutProvider',
        type: 'select',
        label: 'Proveedor de checkout',
        defaultValue: 'other',
        options: [
          {
            label: 'Stripe',
            value: 'stripe',
          },
          {
            label: 'Shopify',
            value: 'shopify',
          },
          {
            label: 'Eventbrite',
            value: 'eventbrite',
          },
          {
            label: 'Mercado Pago',
            value: 'mercadopago',
          },
          {
            label: 'Otro',
            value: 'other',
          },
        ],
        required: true,
      },
      {
        name: 'externalCheckoutURL',
        type: 'text',
        label: 'URL de compra externa',
        admin: {
          description: 'Prepara productos con checkout externo mientras definimos la integracion final de pagos.',
        },
        validate: validateExternalCheckoutURL,
      },
      {
        name: 'externalProductReference',
        type: 'text',
        label: 'Referencia externa',
        admin: {
          description: 'Guarda el ID del producto o precio en la plataforma externa para futuras automatizaciones.',
        },
      },
      {
        name: 'checkoutButtonLabel',
        type: 'text',
        label: 'Texto del boton',
        defaultValue: 'Comprar',
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
    versions: {
      ...(defaultVersions || {}),
      drafts: {
        ...(defaultDrafts || {}),
        autosave: false,
      },
    },
  }
}
