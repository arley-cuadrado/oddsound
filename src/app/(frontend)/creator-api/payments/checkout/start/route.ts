import config from '@payload-config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import type { Product, Profile } from '@/payload-types'
import {
  createMercadoPagoPreference,
  isMercadoPagoReadyForProfile,
  resolveProductPricing,
} from '@/utilities/mercadoPagoCheckout'
import { getServerSideURL } from '@/utilities/getURL'
import { isFanUser } from '@/utilities/isEditorialUser'
import { resolveUserConsumerProfileID } from '@/utilities/userRelations'

export async function GET(request: Request) {
  const startedAt = Date.now()
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })
  const url = new URL(request.url)
  const productID = url.searchParams.get('product')
  const profileSlug = url.searchParams.get('profile')

  if (!productID || !profileSlug) {
    return Response.redirect(`${getServerSideURL()}/search`)
  }

  const returnTo = encodeURIComponent(`/${profileSlug}/shop`)

  if (!user || !isFanUser(user)) {
    payload.logger.warn({ profileSlug }, 'Checkout start rejected: fan login required.')
    return Response.redirect(`${getServerSideURL()}/fan/login?next=${returnTo}`)
  }

  const consumerProfileID = resolveUserConsumerProfileID(user)

  if (!consumerProfileID) {
    payload.logger.warn({ profileSlug, userID: user.id }, 'Checkout start rejected: missing fan profile.')
    return Response.redirect(`${getServerSideURL()}/fan/login?auth=profile-missing&next=${returnTo}`)
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
    payload.logger.warn({ profileSlug, userID: user.id }, 'Checkout start aborted: profile not ready for Mercado Pago.')
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
    payload.logger.warn({ productID, profileSlug, userID: user.id }, 'Checkout start rejected: invalid product.')
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
        consumerProfile: consumerProfileID,
        currency: 'USD',
        customer: String(user.id),
        customerEmail: user.email || '',
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
        release:
          typeof product.release === 'string'
            ? product.release
            : product.release?.id
              ? String(product.release.id)
              : undefined,
        settlementCurrencyCode: 'COP',
        shippingAmountCOP: 0,
        status: 'processing',
        subtotalCOP: pricing.subtotalCOP,
        artistNetAmountCOP: pricing.artistNetAmountCOP,
      } as never,
      depth: 0,
      overrideAccess: true,
    })

    const transaction = await payload.create({
      collection: 'transactions',
      data: {
        amount: product.priceInUSD,
        artistProfile: String(profile.id),
        consumerProfile: consumerProfileID,
        currency: 'USD',
        customer: String(user.id),
        customerEmail: user.email || '',
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
        release:
          typeof product.release === 'string'
            ? product.release
            : product.release?.id
              ? String(product.release.id)
              : undefined,
        settlementCurrencyCode: 'COP',
        status: 'pending',
        artistNetAmountCOP: pricing.artistNetAmountCOP,
      } as never,
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

    payload.logger.info(
      {
        durationMs: Date.now() - startedAt,
        orderID: order.id,
        productID,
        profileSlug,
        transactionID: transaction.id,
        userID: user.id,
      },
      'Checkout start created order and transaction successfully.',
    )

    return Response.redirect(checkoutURL)
  } catch (error) {
    payload.logger.error(
      {
        durationMs: Date.now() - startedAt,
        err: error,
        productID,
        profileSlug,
        userID: user.id,
      },
      'Checkout start failed.',
    )
    return Response.redirect(`${getServerSideURL()}/${profileSlug}/shop?payment=failed`)
  }
}
