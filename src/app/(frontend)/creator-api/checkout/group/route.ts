import config from '@payload-config'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { Order, Profile, Transaction } from '@/payload-types'
import {
  assertGroupIsPurchasable,
  buildServerGroup,
  buildShippingAddress,
  CheckoutError,
  loadAuthorizedCart,
  parseContact,
} from '@/utilities/checkoutSession'
import { createMercadoPagoPreference } from '@/utilities/mercadoPagoCheckout'
import {
  MercadoPagoReconnectRequiredError,
  withMercadoPagoAccessToken,
} from '@/utilities/mercadoPagoTokens'

/** How long an unpaid order stays reusable before we start a fresh one. */
const REUSABLE_ORDER_WINDOW_MS = 30 * 60 * 1000

function fail(error: unknown) {
  if (error instanceof CheckoutError) {
    return Response.json({ code: error.code, message: error.message }, { status: error.status })
  }

  if (error instanceof MercadoPagoReconnectRequiredError) {
    return Response.json(
      {
        code: 'artist_not_ready',
        message: 'Este artista debe volver a conectar su cuenta de Mercado Pago.',
      },
      { status: 409 },
    )
  }

  return Response.json(
    { code: 'checkout_failed', message: 'No pudimos iniciar el pago. Inténtalo de nuevo.' },
    { status: 502 },
  )
}

/**
 * Starts the Mercado Pago checkout for one artist's slice of the cart.
 *
 * There is one of these per artist because the split pays a single seller per
 * transaction. It was a GET before, which meant anyone could mint orders by
 * loading a URL.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config })

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const cartID = String(body.cartID || '')
    const cartSecret = body.cartSecret ? String(body.cartSecret) : null
    const profileID = String(body.profileID || '')
    const contact = parseContact(body.contact)

    if (!profileID) {
      throw new CheckoutError('missing_profile', 'Falta indicar el artista.')
    }

    const { user } = await payload.auth({ headers: await nextHeaders() })
    const cart = await loadAuthorizedCart({
      cartID,
      cartSecret,
      payload,
      userID: user?.id ? String(user.id) : null,
    })

    const profile = (await payload
      .findByID({ collection: 'profiles', id: profileID, depth: 0, overrideAccess: true })
      .catch(() => null)) as Profile | null

    if (!profile) {
      throw new CheckoutError('missing_profile', 'No encontramos a este artista.', 404)
    }

    assertGroupIsPurchasable({ cart, profile, profileID })

    const group = buildServerGroup({ cart, profileID })
    const { totals } = group

    const orderItems = group.items.map((item) => ({
      product: item.productID,
      quantity: item.quantity,
    }))
    const requiresShipping = totals.shippingCOP > 0
    const money = {
      amount: totals.totalCOP,
      artistNetAmountCOP: totals.artistNetEstimateCOP,
      artistProfile: profileID,
      cart: cartID,
      currency: 'COP' as const,
      customerEmail: contact.email,
      items: orderItems,
      paymentProvider: 'mercadopago' as const,
      platformFeeAmountCOP: totals.platformFeeCOP,
      settlementCurrencyCode: 'COP' as const,
      subtotalCOP: totals.subtotalCOP,
    }

    // Clicking pay, backing out of Mercado Pago and clicking again should not
    // leave a trail of dead orders, so an unpaid one for this cart and artist is
    // repriced instead of replaced.
    const existing = await payload.find({
      collection: 'orders',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      sort: '-createdAt',
      where: {
        and: [
          { cart: { equals: cartID } },
          { artistProfile: { equals: profileID } },
          { status: { equals: 'processing' } },
          { createdAt: { greater_than: new Date(Date.now() - REUSABLE_ORDER_WINDOW_MS).toISOString() } },
        ],
      },
    })

    const reusable = (existing.docs[0] as Order | undefined) || null

    const order = reusable
      ? ((await payload.update({
          collection: 'orders',
          id: String(reusable.id),
          data: {
            ...money,
            processorFeeAmountCOP: 0,
            shippingAddress: buildShippingAddress(contact),
            shippingAmountCOP: totals.shippingCOP,
          },
          depth: 0,
          overrideAccess: true,
        })) as Order)
      : ((await payload.create({
          collection: 'orders',
          data: {
            ...money,
            fulfillmentStatus: requiresShipping ? 'pending_payment' : 'not_required',
            processorFeeAmountCOP: 0,
            shippingAddress: buildShippingAddress(contact),
            shippingAmountCOP: totals.shippingCOP,
            status: 'processing',
          },
          depth: 0,
          overrideAccess: true,
        })) as Order)

    const transaction = (await payload.create({
      collection: 'transactions',
      data: {
        ...money,
        order: String(order.id),
        processorFeeAmountCOP: 0,
        status: 'pending',
      },
      depth: 0,
      overrideAccess: true,
    })) as Transaction

    const preference = await withMercadoPagoAccessToken({
      payload,
      profile,
      run: (accessToken) =>
        createMercadoPagoPreference({
          accessToken,
          buyer: { email: contact.email, name: contact.name, phone: contact.phone },
          items: group.items.map((item) => ({
            description: item.releaseTitle,
            imageURL: item.imageURL,
            productID: item.productID,
            quantity: item.quantity,
            title: item.title,
            unitPriceCOP: item.unitPriceCOP,
          })),
          order,
          platformFeeCOP: totals.platformFeeCOP,
          profile,
          shippingCOP: totals.shippingCOP,
          transaction,
        }),
    })

    const initPoint = preference.init_point || preference.sandbox_init_point

    if (!initPoint) {
      throw new CheckoutError('no_checkout_url', 'Mercado Pago no devolvió un enlace de pago.', 502)
    }

    await payload.update({
      collection: 'orders',
      id: String(order.id),
      data: { paymentProviderOrderId: preference.id },
      depth: 0,
      overrideAccess: true,
    })

    return Response.json({ initPoint, orderID: String(order.id) })
  } catch (error) {
    if (!(error instanceof CheckoutError)) {
      payload.logger.error(
        `[checkout] no se pudo iniciar el pago: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }

    return fail(error)
  }
}
