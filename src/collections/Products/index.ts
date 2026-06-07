import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { isAdminUser } from '@/utilities/isAdminUser'
import { slugField } from 'payload'

import { assignProductOwnership } from './hooks/assignProductOwnership'
import { populateProductPublishedAt } from './hooks/populateProductPublishedAt'
import { revalidateProduct, revalidateProductDelete } from './hooks/revalidateProduct'

export const Products: CollectionConfig = {
  slug: 'products',
  indexes: [
    {
      fields: ['profile', 'status', 'publishedAt'],
    },
    {
      fields: ['owner', 'updatedAt'],
    },
    {
      fields: ['slug'],
    },
  ],
  labels: {
    plural: 'Productos',
    singular: 'Producto',
  },
  access: {
    admin: authenticated,
    create: authenticated,
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
          status: {
            equals: 'active',
          },
        } as any
      }

      if (await hasFreshAdminAccess(req as any)) return true

      return {
        owner: {
          equals: user.id,
        },
      } as any
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
    components: {
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
    defaultColumns: ['title', 'status', 'price', 'updatedAt'],
    useAsTitle: 'title',
  },
  defaultPopulate: {
    price: true,
    profile: true,
    slug: true,
    status: true,
    title: true,
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
        condition: (_data, _siblingData, { user }) => isAdminUser(user),
        position: 'sidebar',
      },
    },
    {
      name: 'profile',
      type: 'relationship',
      relationTo: 'profiles',
      required: true,
      access: {
        create: ({ req: { user } }) => isAdminUser(user),
        read: ({ req: { user } }) => isAdminUser(user),
        update: ({ req: { user } }) => isAdminUser(user),
      },
      admin: {
        condition: (_data, _siblingData, { user }) => isAdminUser(user),
        position: 'sidebar',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Producto',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Título',
              required: true,
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Descripción',
            },
            {
              name: 'images',
              type: 'array',
              admin: {
                description: 'La primera imagen será la portada principal del producto en la tienda pública.',
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
              label: 'Imágenes',
              minRows: 1,
            },
            {
              name: 'productType',
              type: 'select',
              defaultValue: 'physical',
              label: 'Tipo de producto',
              admin: {
                hidden: true,
              },
              options: [
                {
                  label: 'Físico',
                  value: 'physical',
                },
              ],
              required: true,
            },
            {
              name: 'status',
              type: 'select',
              defaultValue: 'draft',
              label: 'Estado',
              admin: {
                description:
                  'Borrador no aparece en la tienda. Activo se publica en la tienda pública del artista o la banda.',
              },
              options: [
                {
                  label: 'Borrador',
                  value: 'draft',
                },
                {
                  label: 'Activo',
                  value: 'active',
                },
                {
                  label: 'Archivado',
                  value: 'archived',
                },
              ],
              required: true,
            },
          ],
        },
        {
          label: 'Venta',
          fields: [
            {
              name: 'price',
              type: 'number',
              label: 'Precio',
              min: 0,
              required: true,
            },
            {
              name: 'currency',
              type: 'select',
              defaultValue: 'COP',
              label: 'Moneda',
              options: [
                {
                  label: 'COP',
                  value: 'COP',
                },
                {
                  label: 'USD',
                  value: 'USD',
                },
                {
                  label: 'EUR',
                  value: 'EUR',
                },
              ],
              required: true,
            },
            {
              name: 'inventoryMode',
              type: 'select',
              defaultValue: 'unlimited',
              label: 'Inventario',
              options: [
                {
                  label: 'Ilimitado',
                  value: 'unlimited',
                },
                {
                  label: 'Limitado',
                  value: 'limited',
                },
              ],
            },
            {
              name: 'inventoryQuantity',
              type: 'number',
              admin: {
                condition: (_data, siblingData) => siblingData?.inventoryMode === 'limited',
                description: 'Obligatoria cuando el inventario es limitado.',
              },
              label: 'Cantidad disponible',
              min: 0,
              validate: (
                value: number | null | undefined,
                { siblingData }: { siblingData?: { inventoryMode?: null | string } },
              ) => {
                if (siblingData?.inventoryMode !== 'limited') return true
                return typeof value === 'number' && value >= 0
                  ? true
                  : 'Define cuántas unidades hay disponibles.'
              },
            },
            {
              name: 'fulfillmentType',
              type: 'select',
              defaultValue: 'external',
              label: 'Tipo de entrega',
              options: [
                {
                  label: 'Checkout externo',
                  value: 'external',
                },
                {
                  label: 'Entrega manual',
                  value: 'manual',
                },
                {
                  label: 'Entrega digital',
                  value: 'digital_delivery',
                },
              ],
            },
            {
              name: 'externalCheckoutURL',
              type: 'text',
              admin: {
                condition: (_data, siblingData) => siblingData?.fulfillmentType === 'external',
                description:
                  'Pega aquí la URL de compra del proveedor externo. Ese será el botón Comprar en la tienda pública.',
              },
              label: 'URL de compra externa',
              validate: (
                value: null | string | undefined,
                { siblingData }: { siblingData?: { fulfillmentType?: null | string } },
              ) => {
                if (siblingData?.fulfillmentType !== 'external') return true
                if (typeof value !== 'string' || !value.trim()) {
                  return 'La URL de compra externa es obligatoria.'
                }

                try {
                  new URL(value)
                  return true
                } catch {
                  return 'Ingresa una URL válida para el checkout externo.'
                }
              },
            },
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Fecha de activación',
      admin: {
        description: 'Se completa automáticamente cuando el producto pasa a estado Activo.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    slugField({
      useAsSlug: 'title',
    }),
  ],
  hooks: {
    afterChange: [revalidateProduct],
    afterDelete: [revalidateProductDelete],
    beforeChange: [assignProductOwnership, populateProductPublishedAt],
  },
}
