import type { CollectionConfig, CollectionBeforeValidateHook, Field, FieldAccess } from 'payload'
import { APIError, slugField } from 'payload'

import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { assignOwnership } from '@/hooks/assignOwnership'
import { isAdminUser } from '@/utilities/isAdminUser'
import { isMusicalCreatorUser } from '@/utilities/isEditorialUser'

type OverrideArgs = {
  defaultCollection: CollectionConfig
}

const adminField: FieldAccess = ({ req }) => isAdminUser(req.user)
const technicalAccess = { create: adminField, read: adminField, update: adminField }
const technicalAdmin = {
  condition: (_data: unknown, _siblings: unknown, { user }: { user: unknown }) => isAdminUser(user),
}

export const enforcePhysicalProduct: CollectionBeforeValidateHook = ({
  data,
  req,
  originalDoc,
  operation,
}) => {
  if (!data || !isMusicalCreatorUser(req.user)) return data
  if (data.productType && data.productType !== 'physical')
    throw new APIError('Solo puedes vender productos físicos.', 400)
  if (operation === 'update' && originalDoc?.productType === 'digital')
    throw new APIError('Este producto histórico requiere revisión administrativa.', 400)
  if (data.requiresShipping === false)
    throw new APIError('Los productos físicos requieren envío, también si es gratuito.', 400)
  return { ...data, productType: 'physical', requiresShipping: true }
}

function simplifyPrices(field: Field): Field {
  if ('name' in field && field.name === 'priceInCOPEnabled')
    return {
      ...field,
      defaultValue: true,
      admin: { ...field.admin, hidden: true },
    } as Field
  if ('name' in field && field.name === 'priceInCOP')
    return {
      ...field,
      admin: { ...field.admin, condition: undefined },
    } as Field
  if ('fields' in field) return { ...field, fields: field.fields.map(simplifyPrices) } as Field
  return field
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
  admin: ({ req: { user } }) => isAdminUser(user) || isMusicalCreatorUser(user),
  create: ({ req: { user } }) => isAdminUser(user) || isMusicalCreatorUser(user),
  delete: async ({ req }) => {
    const user = req.user

    if (!user) return false
    if (await hasFreshAdminAccess(req as any)) return true
    if (!isMusicalCreatorUser(user)) return false

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
    if (!isMusicalCreatorUser(user)) return false

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
    if (!isMusicalCreatorUser(user)) return false

    return {
      owner: {
        equals: user.id,
      },
    }
  },
}

export function extendEcommerceProductsCollection({
  defaultCollection,
}: OverrideArgs): CollectionConfig {
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
      defaultColumns: ['title', 'priceInCOP', 'inventory', 'updatedAt'],
      group: 'Tienda',
      hidden: ({ user }) => !isAdminUser(user) && !isMusicalCreatorUser(user),
      useAsTitle: 'title',
      components: {
        ...defaultCollection.admin?.components,
        beforeList: ['@/components/SellerProductsHub'],
      },
    },
    labels: {
      singular: 'Producto',
      plural: 'Productos',
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
        label: 'Título',
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
        admin: { components: { Field: '@/components/PhysicalProductField' } },
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
          condition: (data, siblingData, { user }) =>
            isAdminUser(user) && siblingData?.productType !== 'digital',
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
          description:
            'La primera imagen puede reutilizarse luego en la vitrina publica del producto.',
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
        defaultValue: 'wompi',
        access: technicalAccess,
        admin: technicalAdmin,
        options: [
          { label: 'Wompi', value: 'wompi' },
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
        access: technicalAccess,
        admin: {
          ...technicalAdmin,
          description:
            'Prepara productos con checkout externo mientras definimos la integracion final de pagos.',
        },
        validate: validateExternalCheckoutURL,
      },
      {
        name: 'externalProductReference',
        type: 'text',
        label: 'Referencia externa',
        access: technicalAccess,
        admin: {
          ...technicalAdmin,
          description:
            'Guarda el ID del producto o precio en la plataforma externa para futuras automatizaciones.',
        },
      },
      {
        name: 'checkoutButtonLabel',
        type: 'text',
        label: 'Texto del boton',
        defaultValue: 'Agregar al carrito',
      },
      ...defaultCollection.fields.map(simplifyPrices),
      slugField({
        useAsSlug: 'title',
      }),
    ],
    hooks: {
      ...defaultCollection.hooks,
      beforeValidate: [...(defaultCollection.hooks?.beforeValidate || []), enforcePhysicalProduct],
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
