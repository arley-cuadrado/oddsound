import config from '@payload-config'
import { getPayload } from 'payload'
import { isShoppingEnabled } from '@/config/shopping'
import {
  buildServerGroup,
  assertGroupIsPurchasable,
  loadAuthorizedCart,
  parseContact,
  CheckoutError,
} from '@/utilities/checkoutSession'
import { CommerceError } from '@/commerce/domain'
import { createCheckout } from '@/commerce/service'

export async function POST(request: Request) {
  if (!isShoppingEnabled())
    return Response.json({ message: 'La tienda está desactivada.' }, { status: 503 })
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    const body = await request.json()
    const cart = await loadAuthorizedCart({
      cartID: String(body.cartID || ''),
      cartSecret: body.cartSecret,
      payload,
      userID: user?.id,
    })
    const profile = await payload.findByID({
      collection: 'profiles',
      id: String(body.profileID || ''),
      overrideAccess: true,
      depth: 0,
    })
    assertGroupIsPurchasable({ cart, profile, profileID: profile.id })
    const result = await createCheckout(payload, {
      cart,
      profile,
      group: buildServerGroup({ cart, profileID: profile.id }),
      contact: parseContact(body.contact),
      userID: user?.id,
    })
    return Response.json(result)
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof CommerceError || error instanceof CheckoutError
            ? error.message
            : 'No pudimos iniciar el pago.',
      },
      {
        status:
          error instanceof CommerceError || error instanceof CheckoutError ? error.status : 502,
      },
    )
  }
}
