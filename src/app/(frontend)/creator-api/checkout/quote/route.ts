import config from '@payload-config'
import { getPayload } from 'payload'

import { getPublishedCommerceProductByID, quoteMarketplaceCheckout } from '@/utilities/marketplaceCheckout'

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const body = (await request.json().catch(() => null)) as
    | {
        productId?: string
        quantity?: number
        shippingAddress?: {
          country?: string
          state?: string
        }
      }
    | null

  const productID = body?.productId?.trim()
  const quantity = Math.max(1, Math.min(99, Number(body?.quantity || 1)))

  if (!productID) {
    return Response.json({ message: 'productId is required.' }, { status: 400 })
  }

  const product = await getPublishedCommerceProductByID({
    id: productID,
    payload,
  })

  if (!product) {
    return Response.json({ message: 'Product not found.' }, { status: 404 })
  }

  try {
    const quote = await quoteMarketplaceCheckout({
      payload,
      product,
      quantity,
      shippingAddress: body?.shippingAddress,
    })

    return Response.json(quote)
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : 'Unable to quote checkout.' },
      { status: 400 },
    )
  }
}
