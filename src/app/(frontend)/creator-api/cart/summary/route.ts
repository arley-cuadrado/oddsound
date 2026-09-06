import config from '@payload-config'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'

import { groupCartItemsByArtist } from '@/utilities/cartGroups'
import { CheckoutError, loadAuthorizedCart } from '@/utilities/checkoutSession'

/**
 * The cart, already split into one group per artist.
 *
 * The browser cannot do this on its own: `products.profile` is readable only by
 * authenticated users, so a guest's cart comes back without any idea of who
 * sells what. Grouping here also means the prices and totals the shopper sees
 * come from the same code the checkout re-runs before charging, so the two can
 * never drift apart.
 */
export async function GET(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const url = new URL(request.url)

  try {
    const { user } = await payload.auth({ headers: await nextHeaders() })
    const cart = await loadAuthorizedCart({
      cartID: url.searchParams.get('cart') || '',
      cartSecret: url.searchParams.get('secret'),
      payload,
      userID: user?.id ? String(user.id) : null,
    })

    return Response.json(groupCartItemsByArtist(cart), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof CheckoutError) {
      return Response.json({ code: error.code, message: error.message }, { status: error.status })
    }

    payload.logger.error(
      `[cart] no se pudo resumir el carrito: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )

    return Response.json({ code: 'summary_failed' }, { status: 502 })
  }
}
