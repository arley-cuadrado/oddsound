import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound, permanentRedirect } from 'next/navigation'
import { ShopBackButton } from './ShopBackButton'
import { buildPublicSlugWhere, normalizePublicSlugParam } from '@/utilities/publicSlugs'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

const PROFILE_SHOP_SELECT = {
  displayName: true,
  shopCurrency: true,
  shopEnabled: true,
  slug: true,
} as const

const PRODUCT_SHOP_SELECT = {
  checkoutButtonLabel: true,
  checkoutProvider: true,
  currency: true,
  externalCheckoutURL: true,
  externalProductReference: true,
  images: true,
  price: true,
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
    where: buildPublicSlugWhere(slug),
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
  const profile = await queryProfileBySlug(normalizePublicSlugParam(slug))
  const displayName = profile?.displayName || 'Artista'

  return {
    description: `Explora los productos disponibles en la tienda de ${displayName}.`,
    title: `Tienda de ${displayName}`,
  }
}

export default async function ArtistShopPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = normalizePublicSlugParam(slug)
  const profile = await queryProfileBySlug(decodedSlug)

  if (!profile || !profile.shopEnabled) {
    notFound()
  }

  if (profile.slug && profile.slug !== decodedSlug) {
    permanentRedirect(`/${profile.slug}/shop`)
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
    <div className="mx-auto max-w-6xl pb-24 pt-16 md:pt-20">
      <div className="container">
        <header className="mb-12 overflow-hidden rounded-none text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
          <div className="relative">
            <div className="relative grid gap-8 lg:items-end">
              <div className="grid gap-5">
                <ShopBackButton fallbackHref={`/${profile.slug}/releases`} />
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
                  {profile.displayName || 'Artista'}
                </h1>
              </div>
            </div>
          </div>
        </header>

        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
                  className="group overflow-hidden rounded-[0.625rem] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                    {imageURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={product.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        src={imageURL}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.16),_transparent_40%),linear-gradient(180deg,#111827_0%,#1f2937_100%)] px-8 text-center text-sm text-white/70">
                        Imagen del producto próximamente
                      </div>
                    )}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                      <span className="inline-flex rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-900">
                        Producto
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-5 p-5">
                    <div className="grid gap-3">
                      <h2 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">
                        {product.title}
                      </h2>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
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
                        {typeof product.checkoutButtonLabel === 'string' && product.checkoutButtonLabel.trim()
                          ? product.checkoutButtonLabel
                          : 'Comprar'}
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
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <p className="text-[12px] uppercase tracking-[0.22em] text-[#777] dark:text-[#858c98]">
              Shop
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
              Aún no hay productos activos
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#777] dark:text-[#858c98]">
              Esta tienda todavía está preparando su primer drop. Vuelve pronto para descubrir
              nuevos productos, lanzamientos especiales o tickets.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
