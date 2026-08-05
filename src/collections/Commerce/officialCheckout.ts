import type { CollectionConfig } from 'payload'

type OverrideArgs = {
  defaultCollection: CollectionConfig
}

export function extendEcommerceCartsCollection({ defaultCollection }: OverrideArgs): CollectionConfig {
  return {
    ...defaultCollection,
    admin: {
      ...(defaultCollection.admin || {}),
      defaultColumns: ['customer', 'status', 'subtotal', 'updatedAt'],
      useAsTitle: 'customer',
    },
  }
}

export function extendEcommerceOrdersCollection({ defaultCollection }: OverrideArgs): CollectionConfig {
  return {
    ...defaultCollection,
    admin: {
      ...(defaultCollection.admin || {}),
      defaultColumns: ['customerEmail', 'status', 'amount', 'updatedAt'],
      useAsTitle: 'customerEmail',
    },
  }
}

export function extendEcommerceTransactionsCollection({ defaultCollection }: OverrideArgs): CollectionConfig {
  return {
    ...defaultCollection,
    admin: {
      ...(defaultCollection.admin || {}),
      defaultColumns: ['customerEmail', 'status', 'amount', 'updatedAt'],
      useAsTitle: 'customerEmail',
    },
  }
}
