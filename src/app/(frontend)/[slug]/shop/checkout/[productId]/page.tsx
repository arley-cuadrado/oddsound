import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'

import { CheckoutClient } from './CheckoutClient'
import { findPublicProfileBySlug } from '@/utilities/publicProfiles'
import { normalizePublicSlugParam } from '@/utilities/publicSlugs'
import { findSellerPaymentAccountByProfile, sanitizeSellerPaymentAccount } from '@/utilities/marketplaceSellerAccounts'
import { canUseMarketplaceCheckout, getPublishedCommerceProductByID } from '@/utilities/marketplaceCheckout'

type Args = {
  params: Promise<{
    productId?: string
    slug?: string
  }>
}

export default async function ShopCheckoutPage({ params: paramsPromise }: Args) {
  const payload = await getPayload({ config: configPromise })
  const { productId = '', slug = '' } = await paramsPromise
  const profile = await findPublicProfileBySlug({
    payload,
    slug: normalizePublicSlugParam(slug),
  })

  if (!profile?.id) {
    notFound()
  }

  const product = await getPublishedCommerceProductByID({
    id: productId,
    payload,
  })

  if (!product) {
    notFound()
  }

  const productProfileID =
    typeof product.profile === 'string' ? product.profile : product.profile?.id || null

  if (productProfileID !== profile.id) {
    notFound()
  }

  const sellerAccount = sanitizeSellerPaymentAccount(
    await findSellerPaymentAccountByProfile({
      payload,
      profileID: profile.id,
    }),
  )

  if (
    !canUseMarketplaceCheckout({
      checkoutProvider: product.checkoutProvider,
      externalCheckoutURL: product.externalCheckoutURL,
      sellerAccount,
    })
  ) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-12">
      <CheckoutClient
        product={{
          id: product.id,
          requiresShipping: product.productType !== 'digital' && product.requiresShipping !== false,
          title: product.title || 'Producto',
        }}
        profileSlug={profile.slug || slug}
      />
    </main>
  )
}
