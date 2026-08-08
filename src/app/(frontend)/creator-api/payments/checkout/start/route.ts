import config from '@payload-config'
import { getPayload } from 'payload'

import type { Product, Profile } from '@/payload-types'
import {
  createMercadoPagoPreference,
  isMercadoPagoReadyForProfile,
  resolveProductPricing,
} from '@/utilities/mercadoPagoCheckout'
import { getServerSideURL } from '@/utilities/getURL'

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const url = new URL(request.url)
  const productID = url.searchParams.get('product')
  const profileSlug = url.searchParams.get('profile')

  if (!productID || !profileSlug) {
    return Response.redirect(`${getServerSideURL()}/search`)
  }

  const profilesResult = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      slug: {
        equals: profileSlug,
      },
    },
  })

  const profile = (profilesResult.docs[0] as Profile | undefined) || null

  if (!profile || !isMercadoPagoReadyForProfile(profile)) {
    return Response.redirect(`${getServerSideURL()}/${profileSlug}/shop?payment=not-available`)
  }

  const product = (await payload.findByID({
    collection: 'products',
    id: productID,
    depth: 0,
    overrideAccess: true,
  }).catch(() => null)) as Product | null

  if (
    !product ||
    product._status !== 'published' ||
    product.checkoutProvider !== 'mercadopago' ||
    (typeof product.profile === 'string' ? product.profile : product.profile?.id) !== profile.id
  ) {
    return Response.redirect(`${getServerSideURL()}/${profileSlug}/shop?payment=invalid-product`)
  }

  const pricing = resolveProductPricing(product)
  const fulfillmentStatus =
    product.productType === 'digital' || product.requiresShipping === false
      ? 'not_required'
      : 'pending_payment'

  try {
    const order = await payload.create({
      collection: 'orders',
      data: {
        amount: product.priceInUSD,
        artistProfile: String(profile.id),
        currency: 'USD',
        customerEmail: '',
        fulfillmentStatus,
        items: [
          {
            product: String(product.id),
            quantity: 1,
          },
        ],
        paymentProvider: 'mercadopago',
        platformFeeAmountCOP: pricing.platformFeeAmountCOP,
        processorFeeAmountCOP: 0,
        settlementCurrencyCode: 'COP',
        shippingAmountCOP: 0,
        status: 'processing',
        subtotalCOP: pricing.subtotalCOP,
        artistNetAmountCOP: pricing.artistNetAmountCOP,
      },
      depth: 0,
      overrideAccess: true,
    })

    const transaction = await payload.create({
      collection: 'transactions',
      data: {
        amount: product.priceInUSD,
        artistProfile: String(profile.id),
        currency: 'USD',
        customerEmail: '',
        items: [
          {
            product: String(product.id),
            quantity: 1,
          },
        ],
        order: String(order.id),
        paymentProvider: 'mercadopago',
        platformFeeAmountCOP: pricing.platformFeeAmountCOP,
        processorFeeAmountCOP: 0,
        settlementCurrencyCode: 'COP',
        status: 'pending',
        artistNetAmountCOP: pricing.artistNetAmountCOP,
      },
      depth: 0,
      overrideAccess: true,
    })

    const preference = await createMercadoPagoPreference({
      order,
      product,
      profile,
      transaction,
    })

    await payload.update({
      collection: 'orders',
      id: String(order.id),
      data: {
        paymentProviderOrderId: preference.id,
      },
      depth: 0,
      overrideAccess: true,
    })

    const checkoutURL = preference.init_point || preference.sandbox_init_point

    if (!checkoutURL) {
      throw new Error('Mercado Pago did not return a checkout URL.')
    }

    return Response.redirect(checkoutURL)
  } catch {
    return Response.redirect(`${getServerSideURL()}/${profileSlug}/shop?payment=failed`)
  }
}

