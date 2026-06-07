import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

const PROFILE_SHOP_SELECT = {
  displayName: true,
  shopCurrency: true,
  shopDescription: true,
  shopEnabled: true,
  shopHeadline: true,
  slug: true,
} as const

const PRODUCT_SHOP_SELECT = {
  currency: true,
  externalCheckoutURL: true,
  images: true,
  price: true,
  productType: true,
  slug: true,
  title: true,
} as const

function formatPrice(args: {
  currency?: null | string
  price?: null | number
}) {
  const currency = args.currency || 'COP'
  const price = typeof args.price === 'number' ? args.price : 0

  try {
    return new Intl.NumberFormat('es-CO', {
      currency,
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

async function queryProfileBySlug(slug: string) {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    select: PROFILE_SHOP_SELECT,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs[0] || null
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const profiles = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: {
      shopEnabled: true,
      slug: true,
    },
    where: {
      shopEnabled: {
        equals: true,
      },
    },
  })

  return profiles.docs
    .filter((profile) => typeof profile.slug === 'string' && profile.slug)
    .map((profile) => ({
      slug: profile.slug as string,
    }))
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const profile = await queryProfileBySlug(decodeURIComponent(slug))
  const displayName = profile?.displayName || 'Artista'

  return {
    description: `Explora los productos disponibles en la tienda de ${displayName}.`,
    title: `Tienda de ${displayName}`,
  }
}

export default async function ArtistShopPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const profile = await queryProfileBySlug(decodedSlug)

  if (!profile || !profile.shopEnabled) {
    notFound()
  }

  const payload = await getPayload({ config: configPromise })
  const productsResult = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    select: PRODUCT_SHOP_SELECT,
    sort: '-publishedAt',
    where: {
      and: [
        {
          profile: {
            equals: profile.id,
          },
        },
        {
          status: {
            equals: 'active',
          },
        },
      ],
    },
  })

  const products = productsResult.docs

  return (
    <div className="mx-auto max-w-5xl pb-24 pt-24">
      <div className="container">
        <header className="mb-12 text-center">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[#777] dark:text-[#858c98]">
            Shop
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {profile.shopHeadline || `Tienda de ${profile.displayName}`}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[#777] dark:text-[#858c98]">
            {profile.shopDescription ||
              `Explora los productos disponibles de ${profile.displayName}.`}
          </p>
          <div className="mt-6">
            <Link
              href={`/${profile.slug}`}
              className="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
            >
              Volver al perfil de {profile.displayName}
            </Link>
          </div>
        </header>

        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const firstImage =
                Array.isArray(product.images) && product.images[0] && typeof product.images[0] === 'object'
                  ? product.images[0].image
                  : null

              const imageURL =
                firstImage && typeof firstImage === 'object' && 'url' in firstImage
                  ? firstImage.url || null
                  : null

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                    {imageURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={product.title}
                        className="h-full w-full object-cover"
                        src={imageURL}
                      />
                    ) : null}
                  </div>
                  <div className="grid gap-4 p-5">
                    <div className="grid gap-2">
                      <p className="text-[12px] uppercase tracking-[0.18em] text-[#777] dark:text-[#858c98]">
                        {product.productType === 'ticket'
                          ? 'Ticket'
                          : product.productType === 'digital'
                            ? 'Digital'
                            : 'Producto'}
                      </p>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {product.title}
                      </h2>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {formatPrice({
                          currency: product.currency || profile.shopCurrency || 'COP',
                          price: product.price,
                        })}
                      </p>
                    </div>

                    {typeof product.externalCheckoutURL === 'string' && product.externalCheckoutURL ? (
                      <a
                        className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                        href={product.externalCheckoutURL}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Comprar
                      </a>
                    ) : (
                      <div className="inline-flex w-full items-center justify-center rounded-full border border-dashed border-slate-300 px-4 py-3 text-sm text-[#777] dark:border-slate-700 dark:text-[#858c98]">
                        Compra próximamente
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[#777] dark:text-[#858c98]">
            Aún no hay productos activos en esta tienda.
          </p>
        )}
      </div>
    </div>
  )
}
