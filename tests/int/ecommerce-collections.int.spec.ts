import { describe, expect, it } from 'vitest'

import {
  extendEcommerceCartsCollection,
  extendEcommerceOrdersCollection,
  extendEcommerceTransactionsCollection,
} from '@/collections/Commerce/officialCheckout'
import { extendEcommerceProductsCollection } from '@/collections/Commerce/officialProducts'
import { Pages } from '@/collections/Pages'

const adminUser = {
  role: 'admin' as const,
}

const creatorUser = {
  role: 'creator' as const,
}

function getHiddenHandler(collection: { admin?: { hidden?: boolean | ((args: { user: unknown }) => boolean) } }) {
  if (typeof collection.admin?.hidden !== 'function') {
    throw new Error('Expected collection admin.hidden to be a function.')
  }

  return collection.admin.hidden
}

describe('official ecommerce collection overrides', () => {
  it('extends products with creator ownership and storefront-ready fields', () => {
    const defaultCollection = {
      fields: [{ name: 'inventory', type: 'number' }],
      hooks: {
        beforeChange: [() => null],
      },
      slug: 'products',
    }

    const collection = extendEcommerceProductsCollection({
      defaultCollection: defaultCollection as never,
    })

    const fieldNames = collection.fields?.map((field: any) => field.name).filter(Boolean)

    expect(collection.admin?.defaultColumns).toEqual(['title', 'priceInUSD', 'inventory', 'updatedAt'])
    expect(collection.admin?.useAsTitle).toBe('title')
    expect(fieldNames).toEqual(
      expect.arrayContaining([
        'owner',
        'profile',
        'title',
        'description',
        'coverImage',
        'images',
        'release',
        'checkoutProvider',
        'externalCheckoutURL',
        'externalProductReference',
        'checkoutButtonLabel',
        'inventory',
      ]),
    )
    expect(collection.fields?.at(-1)).toMatchObject({
      type: 'row',
    })
    expect((collection.fields?.at(-1) as any)?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'generateSlug' }),
        expect.objectContaining({ name: 'slug' }),
      ]),
    )
    expect(collection.hooks?.beforeChange).toHaveLength(2)
    const hidden = getHiddenHandler(collection as any)
    expect(hidden({ user: adminUser })).toBe(false)
    expect(hidden({ user: creatorUser })).toBe(true)
  })

  it('keeps carts focused on authenticated operator visibility', () => {
    const collection = extendEcommerceCartsCollection({
      defaultCollection: {
        slug: 'carts',
      } as never,
    })

    expect(collection.admin?.defaultColumns).toEqual(['customer', 'status', 'subtotal', 'updatedAt'])
    expect(collection.admin?.useAsTitle).toBe('customer')
    const hidden = getHiddenHandler(collection as any)
    expect(hidden({ user: adminUser })).toBe(false)
    expect(hidden({ user: creatorUser })).toBe(true)
  })

  it('surfaces the most relevant columns for orders and transactions', () => {
    const orders = extendEcommerceOrdersCollection({
      defaultCollection: {
        slug: 'orders',
      } as never,
    })

    const transactions = extendEcommerceTransactionsCollection({
      defaultCollection: {
        slug: 'transactions',
      } as never,
    })

    expect(orders.admin?.defaultColumns).toEqual(['customerEmail', 'status', 'amount', 'updatedAt'])
    expect(orders.admin?.useAsTitle).toBe('customerEmail')
    expect(transactions.admin?.defaultColumns).toEqual(['customerEmail', 'status', 'amount', 'updatedAt'])
    expect(transactions.admin?.useAsTitle).toBe('customerEmail')
    const ordersHidden = getHiddenHandler(orders as any)
    const transactionsHidden = getHiddenHandler(transactions as any)
    expect(ordersHidden({ user: adminUser })).toBe(false)
    expect(ordersHidden({ user: creatorUser })).toBe(true)
    expect(transactionsHidden({ user: adminUser })).toBe(false)
    expect(transactionsHidden({ user: creatorUser })).toBe(true)

    const orderFieldNames = orders.fields?.map((field: any) => field.name).filter(Boolean)
    const transactionFieldNames = transactions.fields?.map((field: any) => field.name).filter(Boolean)

    expect(orderFieldNames).toEqual(
      expect.arrayContaining(['artistProfile', 'consumerProfile', 'release', 'paymentProviderOrderId', 'trackingNumber']),
    )
    expect(transactionFieldNames).toEqual(
      expect.arrayContaining(['artistProfile', 'consumerProfile', 'release', 'providerEventId', 'paymentProviderPaymentId']),
    )
  })

  it('exposes joined shop products from releases without duplicating relationships', () => {
    const shopProductsField = Pages.fields.find((field: any) => field.name === 'shopProducts') as any

    expect(shopProductsField).toMatchObject({
      collection: 'products',
      label: 'Productos vinculados',
      name: 'shopProducts',
      on: 'release',
      type: 'join',
    })
    expect(shopProductsField.admin?.defaultColumns).toEqual(['title', 'priceInUSD', '_status', 'updatedAt'])
  })
})
