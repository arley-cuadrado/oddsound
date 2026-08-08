import config from '@payload-config'
import { getPayload } from 'payload'

import type { Product } from '@/payload-types'
import { createMercadoPagoPreference } from '@/utilities/mercadoPago'
import { getPublishedCommerceProductByID, quoteMarketplaceCheckout } from '@/utilities/marketplaceCheckout'
import { getMarketplaceSettings } from '@/utilities/marketplaceSettings'
import { getSellerAccessToken } from '@/utilities/marketplaceSellerAccounts'
import { getServerSideURL } from '@/utilities/getURL'

type CreateOrderBody = {
  customerEmail?: string
  customerName?: string
  productId?: string
  quantity?: number
  shippingAddress?: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    country?: string
    firstName?: string
    lastName?: string
    phone?: string
    postalCode?: string
    state?: string
  }
}

function getProductReference(product: Product['profile'] | Product['release']) {
  if (!product || typeof product === 'string') return product || null
  return product.id || null
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const body = (await request.json().catch(() => null)) as CreateOrderBody | null
  const productID = body?.productId?.trim()
  const quantity = Math.max(1, Math.min(99, Number(body?.quantity || 1)))
  const customerEmail = body?.customerEmail?.trim()

  if (!productID || !customerEmail) {
    return Response.json({ message: 'productId and customerEmail are required.' }, { status: 400 })
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
    const settings = await getMarketplaceSettings(payload)

    if (!quote.sellerAccount?.id || !quote.sellerAccount.canReceivePayments) {
      return Response.json(
        { message: 'This artist is not ready to receive marketplace payments yet.' },
        { status: 400 },
      )
    }

    const sellerAccount = await payload.findByID({
      collection: 'seller-payment-accounts',
      id: quote.sellerAccount.id,
      depth: 0,
      overrideAccess: true,
    })
    const sellerAccessToken = getSellerAccessToken(sellerAccount)

    if (!sellerAccessToken) {
      return Response.json(
        { message: 'Missing Mercado Pago access token for the connected artist account.' },
        { status: 503 },
      )
    }

    const order = await payload.create({
      collection: 'orders',
      data: {
        amount: quote.totals.totalAmountCOP,
        artistNetAmountCOP: quote.totals.artistNetAmountCOP,
        artistProfile: getProductReference(product.profile),
        customerEmail,
        fulfillmentStatus: quote.product.requiresShipping ? 'pending_payment' : 'not_required',
        items: [
          {
            product: product.id,
            quantity,
          },
        ],
        paymentProvider: 'mercadopago',
        sellerPaymentAccount: sellerAccount.id,
        settlementCurrencyCode: quote.currencyCode,
        shippingAddress: body?.shippingAddress,
        shippingAmountCOP: quote.shipping.amountCOP,
        shippingZoneCode: quote.shipping.zoneCode,
        splitMode: 'marketplace_split_1_1',
        status: null,
        subtotalCOP: quote.subtotalCOP,
        platformFeeAmountCOP: quote.totals.platformFeeAmountCOP,
      },
      overrideAccess: true,
    })

    const transaction = await payload.create({
      collection: 'transactions',
      data: {
        amount: quote.totals.totalAmountCOP,
        artistNetAmountCOP: quote.totals.artistNetAmountCOP,
        artistProfile: getProductReference(product.profile),
        billingAddress: body?.shippingAddress,
        customerEmail,
        items: [
          {
            product: product.id,
            quantity,
          },
        ],
        order: order.id,
        paymentProvider: 'mercadopago',
        platformFeeAmountCOP: quote.totals.platformFeeAmountCOP,
        sellerPaymentAccount: sellerAccount.id,
        settlementCurrencyCode: quote.currencyCode,
        status: 'pending',
      },
      overrideAccess: true,
    })

    const publicProfileSlug =
      (typeof product.profile === 'object' && product.profile ? product.profile.slug : null) || null
    const resultBaseURL = `${getServerSideURL()}/${publicProfileSlug || 'shop'}/shop/checkout/${product.id}/result?order=${order.id}`
    const webhookURL = new URL(`${getServerSideURL()}/creator-api/payments/mercadopago/webhook`)

    webhookURL.searchParams.set('orderId', order.id)
    webhookURL.searchParams.set('sellerAccountId', sellerAccount.id)
    webhookURL.searchParams.set('transactionId', transaction.id)

    if (settings.webhookAuthToken) {
      webhookURL.searchParams.set('token', settings.webhookAuthToken)
    }

    const preference = await createMercadoPagoPreference({
      accessToken: sellerAccessToken,
      payload: {
        auto_return: 'approved',
        back_urls: {
          failure: `${resultBaseURL}&payment=failure`,
          pending: `${resultBaseURL}&payment=pending`,
          success: `${resultBaseURL}&payment=success`,
        },
        external_reference: order.id,
        items: [
          {
            currency_id: quote.currencyCode,
            id: product.id,
            quantity,
            title: product.title || 'Producto',
            unit_price: quote.totals.unitAmountCOP,
          },
          ...(quote.shipping.amountCOP > 0
            ? [
                {
                  currency_id: quote.currencyCode,
                  id: `shipping-${product.id}`,
                  quantity: 1,
                  title: 'Envío',
                  unit_price: quote.shipping.amountCOP,
                },
              ]
            : []),
        ],
        marketplace_fee: quote.totals.platformFeeAmountCOP,
        metadata: {
          internal_order_id: order.id,
          internal_transaction_id: transaction.id,
          seller_payment_account_id: sellerAccount.id,
        },
        notification_url: webhookURL.toString(),
        payer: {
          email: customerEmail,
          name: body?.customerName || undefined,
        },
      },
    })

    await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        paymentProviderOrderId: preference.id || null,
        transactions: [transaction.id],
      },
      overrideAccess: true,
    })

    return Response.json({
      checkoutURL: preference.init_point || preference.sandbox_init_point || null,
      orderId: order.id,
      paymentProviderOrderId: preference.id || null,
      transactionId: transaction.id,
    })
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : 'Unable to create marketplace order.' },
      { status: 400 },
    )
  }
}
