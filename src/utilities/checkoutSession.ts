import type { Payload } from 'payload'

import type { Cart, Product, Profile } from '@/payload-types'
import { type ArtistCartGroup, groupCartItemsByArtist } from './cartGroups'

export type CheckoutContact = {
  addressLine1?: null | string
  addressLine2?: null | string
  city?: null | string
  email: string
  name?: null | string
  phone?: null | string
  postalCode?: null | string
  state?: null | string
}

export class CheckoutError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.name = 'CheckoutError'
    this.status = status
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function parseContact(value: unknown): CheckoutContact {
  const contact = (value || {}) as Record<string, unknown>
  const email = String(contact.email || '').trim()

  if (!EMAIL_PATTERN.test(email)) {
    throw new CheckoutError('invalid_email', 'Necesitamos un correo válido para enviarte el recibo.')
  }

  const text = (key: string) => {
    const raw = contact[key]

    return typeof raw === 'string' && raw.trim() ? raw.trim() : null
  }

  return {
    addressLine1: text('addressLine1'),
    addressLine2: text('addressLine2'),
    city: text('city'),
    email,
    name: text('name'),
    phone: text('phone'),
    postalCode: text('postalCode'),
    state: text('state'),
  }
}

/**
 * Loads the cart the browser claims to own.
 *
 * Guest carts are gated by the secret the plugin issues at creation, which the
 * browser keeps in localStorage. Without matching it, anyone could check out
 * with somebody else's cart id.
 */
export async function loadAuthorizedCart({
  cartID,
  cartSecret,
  payload,
  userID,
}: {
  cartID: string
  cartSecret?: null | string
  payload: Payload
  userID?: null | string
}): Promise<Cart> {
  if (!cartID) {
    throw new CheckoutError('missing_cart', 'No encontramos tu carrito.', 404)
  }

  const cart = (await payload
    .findByID({
      collection: 'carts',
      id: cartID,
      // Deep enough to reach product → profile, which is what the grouping and
      // the pricing both read.
      depth: 2,
      overrideAccess: true,
    })
    .catch(() => null)) as Cart | null

  if (!cart) {
    throw new CheckoutError('missing_cart', 'No encontramos tu carrito.', 404)
  }

  const ownerID =
    typeof cart.customer === 'string' ? cart.customer : cart.customer?.id ? String(cart.customer.id) : null
  const belongsToUser = Boolean(userID && ownerID && String(userID) === ownerID)
  const secretMatches = Boolean(cart.secret && cartSecret && cart.secret === cartSecret)

  if (!belongsToUser && !secretMatches) {
    throw new CheckoutError('forbidden_cart', 'Este carrito no es tuyo.', 403)
  }

  return cart
}

/** Narrows a cart to a single artist's lines, keeping the populated products. */
export function filterCartToProfile(cart: Cart, profileID: string): Pick<Cart, 'items'> {
  return {
    items: (cart.items || []).filter((item) => {
      const product = item?.product

      if (!product || typeof product === 'string') return false

      const profile = (product as Product).profile

      const id = typeof profile === 'string' ? profile : profile?.id ? String(profile.id) : null

      return id === profileID
    }),
  }
}

/**
 * Recomputes an artist's group from the stored cart.
 *
 * The browser sends ids and quantities, never money: every price here is read
 * back from the database so a tampered request cannot change what gets charged.
 */
export function buildServerGroup({
  cart,
  profileID,
}: {
  cart: Cart
  profileID: string
}): ArtistCartGroup {
  const scoped = filterCartToProfile(cart, profileID)
  const { groups } = groupCartItemsByArtist(scoped)
  const group = groups[0]

  if (!group || group.items.length === 0) {
    throw new CheckoutError('empty_group', 'No hay productos de este artista en tu carrito.', 409)
  }

  return group
}

/** Rejects lines whose product went unpublished or ran out while in the cart. */
export function assertGroupIsPurchasable({
  cart,
  profile,
  profileID,
}: {
  cart: Cart
  profile: Profile
  profileID: string
}): void {
  if (profile.mercadoPagoConnection?.status !== 'connected') {
    throw new CheckoutError(
      'artist_not_ready',
      `${profile.displayName || 'Este artista'} todavía no puede recibir pagos.`,
      409,
    )
  }

  for (const item of filterCartToProfile(cart, profileID).items || []) {
    const product = item?.product as Product

    if (product._status !== 'published') {
      throw new CheckoutError('product_unavailable', `«${product.title}» ya no está disponible.`, 409)
    }

    if (typeof product.priceInCOP !== 'number' || product.priceInCOP <= 0) {
      throw new CheckoutError('product_unpriced', `«${product.title}» no tiene precio.`, 409)
    }

    if (typeof product.inventory === 'number' && product.inventory < (item.quantity || 1)) {
      throw new CheckoutError(
        'insufficient_inventory',
        `Solo quedan ${product.inventory} de «${product.title}».`,
        409,
      )
    }
  }
}

export function buildShippingAddress(contact: CheckoutContact) {
  return {
    addressLine1: contact.addressLine1 || '',
    addressLine2: contact.addressLine2 || '',
    city: contact.city || '',
    country: 'CO',
    firstName: contact.name || '',
    phone: contact.phone || '',
    postalCode: contact.postalCode || '',
    state: contact.state || '',
  }
}
