import type { Payload, Where } from 'payload'

import type { Page, Product, Profile, User } from '@/payload-types'

type ProductReference = {
  id: string
  slug?: null | string
  title?: null | string
}

export type CommerceProductSummary = {
  checkoutButtonLabel?: null | string
  checkoutProvider?: null | string
  coverImage?: Product['coverImage']
  createdAt: string
  description?: null | string
  externalCheckoutURL?: null | string
  externalProductReference?: null | string
  id: string
  images?: Product['images']
  inventory?: null | number
  priceInUSD?: null | number
  profile?: ProductReference | null
  release?: ProductReference | null
  slug?: null | string
  status?: Product['_status']
  title?: null | string
  updatedAt: string
}

export type GroupedCommerceProducts = {
  products: CommerceProductSummary[]
  release: null | ProductReference
}

type ResolveReferenceArgs = {
  payload: Payload
  collection: 'pages' | 'profiles'
  value: string
}

type ListCommerceProductsArgs = {
  includeDrafts?: boolean
  limit?: number
  ownerID?: null | string
  payload: Payload
  profile?: null | string
  release?: null | string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function toReference(value: Product['profile'] | Product['release']): null | ProductReference {
  if (!value || typeof value === 'string') return value ? { id: value } : null
  if (!isRecord(value) || typeof value.id !== 'string') return null

  return {
    id: value.id,
    slug: typeof value.slug === 'string' ? value.slug : null,
    title:
      typeof value.title === 'string'
        ? value.title
        : typeof value.displayName === 'string'
          ? value.displayName
          : null,
  }
}

async function resolveCollectionReference({
  collection,
  payload,
  value,
}: ResolveReferenceArgs): Promise<null | string> {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  try {
    const document = await payload.findByID({
      collection,
      id: trimmedValue,
      depth: 0,
      overrideAccess: true,
    })

    return typeof document?.id === 'string' ? document.id : null
  } catch {
    const result = await payload.find({
      collection,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        slug: {
          equals: trimmedValue,
        },
      },
    })

    const document = result.docs[0] as Page | Profile | undefined

    return typeof document?.id === 'string' ? document.id : null
  }
}

export function resolveUserProfileID(user: null | User | undefined): null | string {
  if (!user?.profile) return null
  if (typeof user.profile === 'string') return user.profile
  if (isRecord(user.profile) && typeof user.profile.id === 'string') return user.profile.id

  return null
}

export function groupCommerceProductsByRelease(products: CommerceProductSummary[]): GroupedCommerceProducts[] {
  const groups = new Map<string, GroupedCommerceProducts>()

  products.forEach((product) => {
    const release = product.release || null
    const key = release?.id || 'unlinked'
    const existing = groups.get(key)

    if (existing) {
      existing.products.push(product)
      return
    }

    groups.set(key, {
      products: [product],
      release,
    })
  })

  return Array.from(groups.values()).sort((left, right) => {
    const leftDate = left.products[0]?.updatedAt || ''
    const rightDate = right.products[0]?.updatedAt || ''

    return rightDate.localeCompare(leftDate)
  })
}

export async function hasPublishedCommerceProducts(args: {
  payload: Payload
  profile?: null | string
  release?: null | string
}): Promise<boolean> {
  const products = await listCommerceProducts({
    includeDrafts: false,
    limit: 1,
    payload: args.payload,
    profile: args.profile,
    release: args.release,
  })

  return products.length > 0
}

export async function listCommerceProducts({
  includeDrafts = false,
  limit = 100,
  ownerID,
  payload,
  profile,
  release,
}: ListCommerceProductsArgs): Promise<CommerceProductSummary[]> {
  const profileID = profile
    ? await resolveCollectionReference({
        collection: 'profiles',
        payload,
        value: profile,
      })
    : null

  const releaseID = release
    ? await resolveCollectionReference({
        collection: 'pages',
        payload,
        value: release,
      })
    : null

  const whereClauses: Where[] = []

  if (!includeDrafts) {
    whereClauses.push({
      _status: {
        equals: 'published',
      },
    })
  }

  if (ownerID) {
    whereClauses.push({
      owner: {
        equals: ownerID,
      },
    })
  }

  if (profile && !profileID) return []
  if (release && !releaseID) return []

  if (profileID) {
    whereClauses.push({
      profile: {
        equals: profileID,
      },
    })
  }

  if (releaseID) {
    whereClauses.push({
      release: {
        equals: releaseID,
      },
    })
  }

  const result = await payload.find({
    collection: 'products',
    depth: 1,
    limit,
    overrideAccess: true,
    pagination: false,
    sort: '-updatedAt',
    where: whereClauses.length > 1 ? { and: whereClauses } : whereClauses[0] || undefined,
  })

  return (result.docs as Product[]).map((product) => ({
    checkoutButtonLabel: product.checkoutButtonLabel,
    checkoutProvider: product.checkoutProvider,
    coverImage: product.coverImage,
    createdAt: product.createdAt,
    description: product.description,
    externalCheckoutURL: product.externalCheckoutURL,
    externalProductReference: product.externalProductReference,
    id: product.id,
    images: product.images,
    inventory: product.inventory,
    priceInUSD: product.priceInUSD,
    profile: toReference(product.profile),
    release: toReference(product.release),
    slug: product.slug,
    status: product._status,
    title: product.title,
    updatedAt: product.updatedAt,
  }))
}
