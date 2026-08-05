import type { Metadata } from 'next'

import configPromise from '@payload-config'
import type { Media } from '@/payload-types'
import { getPayload } from 'payload'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'

import { Media as MediaComponent } from '@/components/Media'
import { ShopBackButton } from './ShopBackButton'
import { findPublicProfileBySlug } from '@/utilities/publicProfiles'
import { listCommerceProducts } from '@/utilities/commerceProducts'
import { normalizePublicSlugParam } from '@/utilities/publicSlugs'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

function getProductVisual(product: Awaited<ReturnType<typeof listCommerceProducts>>[number]) {
  if (product.coverImage && typeof product.coverImage === 'object') {
    return product.coverImage as Media
  }

  const firstGalleryImage = product.images?.[0]?.image

  if (firstGalleryImage && typeof firstGalleryImage === 'object') {
    return firstGalleryImage as Media
  }

  return null
}

async function queryShopByProfileSlug(slug: string) {
  const payload = await getPayload({ config: configPromise })
  const profile = await findPublicProfileBySlug({ payload, slug })

  if (!profile?.id) {
    return { products: [], profile: null }
  }

  const products = await listCommerceProducts({
    includeDrafts: false,
    payload,
    profile: profile.id,
  })

  return {
    products,
    profile,
  }
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const decodedSlug = normalizePublicSlugParam(slug)
  const { products, profile } = await queryShopByProfileSlug(decodedSlug)

  if (!profile || products.length === 0) {
    return {
      title: 'Shop',
    }
  }

  return {
    description: `Explora los productos oficiales disponibles de ${profile.displayName || 'este artista'}.`,
    title: `Shop de ${profile.displayName || 'artista'}`,
  }
}

export default async function ArtistShopPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = normalizePublicSlugParam(slug)
  const { products, profile } = await queryShopByProfileSlug(decodedSlug)

  if (!profile) {
    notFound()
  }

  if (profile.slug && profile.slug !== decodedSlug) {
    permanentRedirect(`/${profile.slug}/shop`)
  }

  if (products.length === 0) {
    notFound()
  }

  const shopGridClassName =
    products.length === 1 ? 'grid gap-5' : 'grid grid-cols-2 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3'

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-12">
      <div className="space-y-8">
        <header className="space-y-5 rounded-[32px] border border-border/70 bg-white/80 p-6 shadow-[0_18px_60px_rgba(49,46,46,0.08)] backdrop-blur dark:bg-[#111111]/90 md:p-8">
          <ShopBackButton fallbackHref={`/${profile.slug}/releases`} label="Shop" />

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/55">
              Official Shop
            </p>
            <h1 className="text-3xl font-medium tracking-tight text-foreground md:text-5xl">
              {profile.displayName || 'Artista'}
            </h1>
            <p className="max-w-[44rem] text-[13px] leading-6 text-foreground/75">
              Productos oficiales conectados al ecommerce de Payload y visibles desde el perfil
              publico del artista.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-[12px] text-foreground/70 dark:text-white/80">
            <span className="rounded-full bg-[#f4efe6] px-3 py-1.5 dark:bg-white/10 dark:text-white">
              {products.length} producto{products.length === 1 ? '' : 's'}
            </span>
            {profile.genre ? (
              <span className="rounded-full bg-[#f4efe6] px-3 py-1.5 dark:bg-white/10 dark:text-white">
                {profile.genre}
              </span>
            ) : null}
            {profile.location ? (
              <span className="rounded-full bg-[#f4efe6] px-3 py-1.5 dark:bg-white/10 dark:text-white">
                {profile.location}
              </span>
            ) : null}
          </div>
        </header>

        <div className={shopGridClassName}>
          {products.map((product) => {
            const visual = getProductVisual(product)

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-[28px] border border-border/70 bg-white shadow-[0_18px_60px_rgba(49,46,46,0.08)] dark:bg-[#171717]"
              >
                <div className="relative aspect-[4/5] bg-[#efebe4]">
                  {visual ? (
                    <MediaComponent
                      className="h-full w-full"
                      imgClassName="h-full w-full object-cover"
                      resource={visual}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-[12px] uppercase tracking-[0.18em] text-foreground/45">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <h2 className="text-lg font-medium text-foreground">
                      {product.title || 'Producto sin titulo'}
                    </h2>
                    {product.description ? (
                      <p className="text-[13px] leading-6 text-foreground/72 dark:text-white/72">
                        {product.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 text-[12px] text-foreground/72 dark:text-white/80">
                    {typeof product.priceInUSD === 'number' ? (
                      <span className="rounded-full bg-[#f4efe6] px-3 py-1.5 dark:bg-white/10 dark:text-white">
                        USD {product.priceInUSD}
                      </span>
                    ) : null}
                    {typeof product.inventory === 'number' ? (
                      <span className="rounded-full bg-[#f4efe6] px-3 py-1.5 dark:bg-white/10 dark:text-white">
                        Inventario {product.inventory}
                      </span>
                    ) : null}
                    {product.release?.title ? (
                      <span className="rounded-full bg-[#f4efe6] px-3 py-1.5 dark:bg-white/10 dark:text-white">
                        {product.release.title}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {product.externalCheckoutURL ? (
                      <a
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[#312e2e] px-5 text-[13px] font-medium text-white transition hover:opacity-90"
                        href={product.externalCheckoutURL}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {product.checkoutButtonLabel || 'Comprar'}
                      </a>
                    ) : null}
                    {product.release?.slug ? (
                      <Link
                        className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-[13px] font-medium text-foreground transition hover:bg-[#f3efe8] dark:border-white/15 dark:text-white dark:hover:bg-white/10"
                        href={`/${profile.slug}/release/${product.release.slug}`}
                      >
                        Ver release
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
