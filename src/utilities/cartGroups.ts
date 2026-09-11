import type { Cart, Media, Page, Product, Profile } from '@/payload-types'

import { getMediaResourceURL } from './getMediaUrl'
import { computeGroupTotals, getPlatformFeePercent, type GroupTotals } from './money'

/**
 * Why a cart cannot be paid.
 *
 * `no_payments` is the common one: Mercado Pago's split only pays one seller per
 * transaction, so an artist who has not linked their account has nowhere to
 * receive the money.
 */
export type CartGroupBlockedReason = 'no_payments' | 'unavailable'

export type CartGroupItem = {
  /** Cart item id, which is what the increment/remove endpoints take. */
  id: string
  imageURL: null | string
  lineTotalCOP: number
  productID: string
  productSlug: null | string
  quantity: number
  releaseTitle: null | string
  title: string
  unitPriceCOP: number
}

export type ArtistCartGroup = {
  /** Artist photo, falling back to the first product image. Drives the header
   *  of each group card and the stacked cluster on the cart badge. */
  avatarURL: null | string
  blockedReason: CartGroupBlockedReason | null
  canCheckout: boolean
  imageURL: null | string
  items: CartGroupItem[]
  profileID: string
  profileName: string
  profileSlug: null | string
  shippingNotes: null | string
  totals: GroupTotals
}

export type CartSummary = {
  artistCount: number
  groups: ArtistCartGroup[]
  itemCount: number
  payableGroupCount: number
  /** The sum of every group. Always shown next to the payment count so it is
   *  never mistaken for a single charge. */
  totalCOP: number
}

/** The shape the plugin's cart carries once fetched at depth 2. */
type PopulatedCartItem = NonNullable<Cart['items']>[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function resolveProduct(item: PopulatedCartItem): null | Product {
  const product = item?.product

  return isRecord(product) ? (product as Product) : null
}

function resolveProfile(product: null | Product): null | Profile {
  const profile = product?.profile

  return isRecord(profile) ? (profile as Profile) : null
}

function resolveProductImage(product: Product): null | string {
  const cover = product.coverImage
  const gallery = product.images?.[0]?.image

  return (
    getMediaResourceURL(isRecord(cover) ? (cover as Media) : null) ||
    getMediaResourceURL(isRecord(gallery) ? (gallery as Media) : null)
  )
}

function resolveReleaseTitle(product: Product): null | string {
  const release = product.release

  return isRecord(release) ? (release as Page).title || null : null
}

export function isProfileReadyForPayments(profile: null | Profile): boolean {
  return profile?.mercadoPagoConnection?.status === 'connected'
}

export function getShippingFlatRateCOP(profile: null | Profile): number {
  const rate = Number(profile?.commerce?.shippingFlatRateCOP)

  return Number.isFinite(rate) && rate > 0 ? Math.round(rate) : 0
}

/**
 * Splits a cart into one group per artist.
 *
 * This mirrors what Mercado Pago forces on us — the 1:1 split pays exactly one
 * seller per transaction — so the grouping is not a presentation choice, it is
 * the shape of the payments themselves. Everything the cart page renders comes
 * from here, which is also why it stays pure and isomorphic: the same function
 * runs in the browser while someone edits quantities and on the server when the
 * checkout revalidates the amounts.
 */
export function groupCartItemsByArtist(
  cart: null | Pick<Cart, 'items'> | undefined,
  options?: {
    /** Only physical goods should be charged shipping. */
    includeShipping?: boolean
    platformFeePercent?: number
  },
): CartSummary {
  const platformFeePercent = options?.platformFeePercent ?? getPlatformFeePercent()
  const includeShipping = options?.includeShipping ?? true

  const grouped = new Map<
    string,
    {
      items: CartGroupItem[]
      needsShipping: boolean
      profile: null | Profile
      profileName: string
      profileSlug: null | string
    }
  >()

  for (const item of cart?.items || []) {
    const product = resolveProduct(item)
    const profile = resolveProfile(product)

    // A product that failed to populate, lost its artist, or was unpublished
    // still gets a group. Silently dropping a paid-for line would be worse than
    // showing it as unavailable.
    const key = profile?.id ? String(profile.id) : 'unavailable'
    const quantity = Math.max(1, Math.round(Number(item?.quantity) || 1))
    const unitPriceCOP = Math.max(0, Math.round(Number(product?.priceInCOP) || 0))

    const entry = grouped.get(key) || {
      items: [],
      needsShipping: false,
      profile,
      profileName: profile?.displayName || 'Producto no disponible',
      profileSlug: profile?.slug || null,
    }

    entry.items.push({
      id: String(item?.id || product?.id || ''),
      imageURL: product ? resolveProductImage(product) : null,
      lineTotalCOP: unitPriceCOP * quantity,
      productID: String(product?.id || ''),
      productSlug: product?.slug || null,
      quantity,
      releaseTitle: product ? resolveReleaseTitle(product) : null,
      title: product?.title || 'Producto no disponible',
      unitPriceCOP,
    })

    if (product?.productType !== 'digital' && product?.requiresShipping !== false) {
      entry.needsShipping = true
    }

    grouped.set(key, entry)
  }

  const groups: ArtistCartGroup[] = Array.from(grouped.entries()).map(([key, entry]) => {
    const missingProfile = key === 'unavailable'
    const readyForPayments = isProfileReadyForPayments(entry.profile)
    const shippingCOP =
      includeShipping && entry.needsShipping ? getShippingFlatRateCOP(entry.profile) : 0

    const imageURL = entry.items.find((item) => item.imageURL)?.imageURL || null

    return {
      avatarURL:
        getMediaResourceURL(isRecord(entry.profile?.avatar) ? (entry.profile?.avatar as Media) : null) ||
        imageURL,
      blockedReason: missingProfile ? 'unavailable' : readyForPayments ? null : 'no_payments',
      canCheckout: !missingProfile && readyForPayments,
      imageURL,
      items: entry.items,
      profileID: missingProfile ? '' : key,
      profileName: entry.profileName,
      profileSlug: entry.profileSlug,
      shippingNotes: entry.profile?.commerce?.shippingNotes || null,
      totals: computeGroupTotals({
        items: entry.items.map((item) => ({
          quantity: item.quantity,
          unitPriceCOP: item.unitPriceCOP,
        })),
        platformFeePercent,
        shippingCOP,
      }),
    }
  })

  // Payable groups first: the blocked ones are dead ends, so they belong at the
  // bottom where they do not interrupt the run of pay buttons.
  groups.sort((left, right) => {
    if (left.canCheckout !== right.canCheckout) return left.canCheckout ? -1 : 1

    return left.profileName.localeCompare(right.profileName, 'es')
  })

  return {
    artistCount: groups.length,
    groups,
    itemCount: groups.reduce(
      (sum, group) => sum + group.items.reduce((count, item) => count + item.quantity, 0),
      0,
    ),
    payableGroupCount: groups.filter((group) => group.canCheckout).length,
    totalCOP: groups.reduce((sum, group) => sum + group.totals.totalCOP, 0),
  }
}
