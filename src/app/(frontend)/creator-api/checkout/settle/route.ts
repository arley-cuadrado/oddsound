import config from '@payload-config'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { Cart, Order, Product } from '@/payload-types'
import { CheckoutError, loadAuthorizedCart } from '@/utilities/checkoutSession'

/**
 * Clears a paid artist's lines out of the cart, once the payment is actually
 * confirmed.
 *
 * The browser calls this when it comes back from Mercado Pago. Coming back is
 * not proof of payment — the webhook is — so a cart is only emptied for an order
 * that already reads `completed`. Until then the items stay put and the caller
 * is told to wait, because losing someone's cart on a payment that later failed
 * is far worse than a few seconds of uncertainty.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config })

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const cartID = String(body.cartID || '')
    const cartSecret = body.cartSecret ? String(body.cartSecret) : null
    const orderID = String(body.orderID || '')

    if (!orderID) {
      throw new CheckoutError('missing_order', 'Falta el pedido.')
    }

    const { user } = await payload.auth({ headers: await nextHeaders() })
    const cart = await loadAuthorizedCart({
      cartID,
      cartSecret,
      payload,
      userID: user?.id ? String(user.id) : null,
    })

    const order = (await payload
      .findByID({ collection: 'orders', id: orderID, depth: 0, overrideAccess: true })
      .catch(() => null)) as Order | null

    const orderCartID =
      typeof order?.cart === 'string' ? order.cart : order?.cart?.id ? String(order.cart.id) : null

    if (!order || orderCartID !== cartID) {
      throw new CheckoutError('missing_order', 'No encontramos ese pedido.', 404)
    }

    const status = order.status || 'processing'

    if (status !== 'completed') {
      return Response.json({ orderStatus: status, settled: false })
    }

    const artistProfileID =
      typeof order.artistProfile === 'string'
        ? order.artistProfile
        : order.artistProfile?.id
          ? String(order.artistProfile.id)
          : null

    const remaining = (cart.items || []).filter((item) => {
      const product = item?.product

      if (!product || typeof product === 'string') return true

      const profile = (product as Product).profile
      const id = typeof profile === 'string' ? profile : profile?.id ? String(profile.id) : null

      return id !== artistProfileID
    })

    await payload.update({
      collection: 'carts',
      id: cartID,
      data: {
        items: remaining.map((item) => ({
          product: typeof item.product === 'string' ? item.product : String(item.product?.id || ''),
          quantity: item.quantity,
        })),
        // The other artists in this cart still have to be paid, so the cart
        // stays active until the last group clears.
        ...(remaining.length === 0 ? { purchasedAt: new Date().toISOString(), status: 'purchased' as const } : {}),
      } satisfies Partial<Cart>,
      depth: 0,
      overrideAccess: true,
    })

    return Response.json({ orderStatus: status, settled: true })
  } catch (error) {
    if (error instanceof CheckoutError) {
      return Response.json({ code: error.code, message: error.message }, { status: error.status })
    }

    payload.logger.error(
      `[checkout] no se pudo liquidar el carrito: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )

    return Response.json({ code: 'settle_failed', message: 'No pudimos actualizar el carrito.' }, { status: 502 })
  }
}
