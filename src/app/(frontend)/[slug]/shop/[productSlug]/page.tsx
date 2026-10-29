import config from '@payload-config'
import { getPayload } from 'payload'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { isShoppingEnabled } from '@/config/shopping'
import { findPublicProfileBySlug } from '@/utilities/publicProfiles'
import { normalizePublicSlugParam } from '@/utilities/publicSlugs'
import { formatCOP } from '@/utilities/money'
import { Media } from '@/components/Media'
import { AddToCartButton } from '@/components/Cart/AddToCartButton'
import { ProductReviews } from '@/components/ProductReviews'
import type { Media as MediaType } from '@/payload-types'

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>
}) {
  if (!isShoppingEnabled()) notFound()
  const values = await params
  const payload = await getPayload({ config })
  const profile = await findPublicProfileBySlug({
    payload,
    slug: normalizePublicSlugParam(values.slug),
  })
  if (!profile || profile.commerce?.salesBlocked) notFound()
  const result = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        { profile: { equals: profile.id } },
        { slug: { equals: normalizePublicSlugParam(values.productSlug) } },
        { _status: { equals: 'published' } },
      ],
    },
  })
  const product = result.docs[0]
  if (!product) notFound()
  if (values.slug !== profile.slug || values.productSlug !== product.slug)
    permanentRedirect(`/${profile.slug}/shop/${product.slug}`)
  const images = [product.coverImage, ...(product.images || []).map((i) => i.image)].filter(
    (i): i is MediaType => Boolean(i && typeof i === 'object'),
  )
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <Link className="underline" href={`/${profile.slug}/shop`}>
        Volver a la tienda de {profile.displayName}
      </Link>
      <h1 className="text-3xl">{product.title}</h1>
      <p className="whitespace-pre-wrap">{product.description}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {images.map((i, index) => (
          <Media key={`${i.id}-${index}`} resource={i} />
        ))}
      </div>
      <p>{formatCOP(product.priceInCOP || 0)}</p>
      <p>Disponibilidad: {product.inventory || 0} unidades</p>
      {product.productType === 'physical' &&
        (product.inventory || 0) > 0 &&
        product.priceInCOPEnabled !== false && <AddToCartButton productID={product.id} />}
      <ProductReviews product={product.id} />
    </main>
  )
}
