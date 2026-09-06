import { beforeEach, describe, expect, it } from 'vitest'

import type { Cart, Product, Profile } from '@/payload-types'
import { groupCartItemsByArtist } from '@/utilities/cartGroups'

function buildProfile(overrides: Partial<Profile> & { id: string }): Profile {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    displayName: `Artista ${overrides.id}`,
    mercadoPagoConnection: { status: 'connected' },
    owner: 'user-1',
    slug: `artista-${overrides.id}`,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Profile
}

function buildProduct(overrides: Partial<Product> & { id: string; profile: Profile }): Product {
  return {
    checkoutProvider: 'mercadopago',
    createdAt: '2026-01-01T00:00:00.000Z',
    priceInCOP: 100000,
    productType: 'physical',
    slug: `producto-${overrides.id}`,
    title: `Producto ${overrides.id}`,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as unknown as Product
}

function buildCart(items: { id: string; product: Product; quantity?: number }[]): Cart {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    id: 'cart-1',
    items: items.map((item) => ({
      id: item.id,
      product: item.product,
      quantity: item.quantity ?? 1,
    })),
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as unknown as Cart
}

describe('groupCartItemsByArtist', () => {
  beforeEach(() => {
    process.env.MARKETPLACE_PLATFORM_FEE_PERCENT = '12'
  })

  it('splits a mixed cart into one group per artist', () => {
    const first = buildProfile({ displayName: 'Alba', id: 'p1' })
    const second = buildProfile({ displayName: 'Beto', id: 'p2' })

    const summary = groupCartItemsByArtist(
      buildCart([
        { id: 'i1', product: buildProduct({ id: 'a', profile: first }) },
        { id: 'i2', product: buildProduct({ id: 'b', profile: first }), quantity: 2 },
        { id: 'i3', product: buildProduct({ id: 'c', profile: second }) },
      ]),
    )

    expect(summary.groups).toHaveLength(2)
    expect(summary.artistCount).toBe(2)
    expect(summary.itemCount).toBe(4)
    expect(summary.groups[0]?.items).toHaveLength(2)
    expect(summary.groups[1]?.items).toHaveLength(1)
  })

  it('blocks an artist without a Mercado Pago connection and sorts them last', () => {
    const ready = buildProfile({ displayName: 'Zulema', id: 'p1' })
    const notReady = buildProfile({
      displayName: 'Alba',
      id: 'p2',
      mercadoPagoConnection: { status: 'not_connected' },
    })

    const summary = groupCartItemsByArtist(
      buildCart([
        { id: 'i1', product: buildProduct({ id: 'a', profile: notReady }) },
        { id: 'i2', product: buildProduct({ id: 'b', profile: ready }) },
      ]),
    )

    // Alphabetically Alba comes first, so ordering here is driven by payability.
    expect(summary.groups[0]?.profileName).toBe('Zulema')
    expect(summary.groups[0]?.canCheckout).toBe(true)
    expect(summary.groups[1]?.canCheckout).toBe(false)
    expect(summary.groups[1]?.blockedReason).toBe('no_payments')
    expect(summary.payableGroupCount).toBe(1)
  })

  it('charges each artist their own flat shipping, once per group', () => {
    const first = buildProfile({
      commerce: { shippingFlatRateCOP: 15000 },
      id: 'p1',
    } as Partial<Profile> & { id: string })
    const second = buildProfile({ id: 'p2' })

    const summary = groupCartItemsByArtist(
      buildCart([
        { id: 'i1', product: buildProduct({ id: 'a', profile: first }) },
        { id: 'i2', product: buildProduct({ id: 'b', profile: first }) },
        { id: 'i3', product: buildProduct({ id: 'c', profile: second }) },
      ]),
    )

    const withShipping = summary.groups.find((group) => group.profileID === 'p1')
    const withoutShipping = summary.groups.find((group) => group.profileID === 'p2')

    expect(withShipping?.totals.shippingCOP).toBe(15000)
    expect(withShipping?.totals.totalCOP).toBe(215000)
    expect(withoutShipping?.totals.shippingCOP).toBe(0)
  })

  it('does not charge shipping on a digital-only group', () => {
    const profile = buildProfile({
      commerce: { shippingFlatRateCOP: 15000 },
      id: 'p1',
    } as Partial<Profile> & { id: string })

    const summary = groupCartItemsByArtist(
      buildCart([
        { id: 'i1', product: buildProduct({ id: 'a', productType: 'digital', profile }) },
      ]),
    )

    expect(summary.groups[0]?.totals.shippingCOP).toBe(0)
  })

  it('keeps an item whose product lost its artist, marked unavailable', () => {
    const cart = {
      items: [{ id: 'i1', product: 'orphan-product-id', quantity: 1 }],
    } as unknown as Cart

    const summary = groupCartItemsByArtist(cart)

    expect(summary.groups).toHaveLength(1)
    expect(summary.groups[0]?.blockedReason).toBe('unavailable')
    expect(summary.groups[0]?.canCheckout).toBe(false)
  })

  it('reports the grand total as the sum of every group', () => {
    const first = buildProfile({ id: 'p1' })
    const second = buildProfile({ id: 'p2' })

    const summary = groupCartItemsByArtist(
      buildCart([
        { id: 'i1', product: buildProduct({ id: 'a', priceInCOP: 120000, profile: first }) },
        { id: 'i2', product: buildProduct({ id: 'b', priceInCOP: 80000, profile: second }) },
      ]),
    )

    expect(summary.totalCOP).toBe(200000)
    expect(summary.payableGroupCount).toBe(2)
  })

  it('returns an empty summary for an empty cart', () => {
    const summary = groupCartItemsByArtist(null)

    expect(summary.groups).toHaveLength(0)
    expect(summary.itemCount).toBe(0)
    expect(summary.totalCOP).toBe(0)
  })
})
