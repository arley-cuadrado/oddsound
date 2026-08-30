import type { Order, Profile, Transaction } from '@/payload-types'
import { COP } from '@/config/currencies'
import { getServerSideURL } from './getURL'
import { MERCADO_PAGO_API_BASE } from './mercadoPagoConfig'
import { MercadoPagoUnauthorizedError } from './mercadoPagoTokens'

/** Mercado Pago abandons an unpaid preference after this long. */
const PREFERENCE_TTL_MS = 30 * 60 * 1000

type MercadoPagoPreferenceResponse = {
  id: string
  init_point?: string
  sandbox_init_point?: string
}

type MercadoPagoPaymentResponse = {
  additional_info?: {
    items?: {
      id?: string
      title?: string
    }[]
  }
  currency_id?: string
  date_approved?: string
  external_reference?: string
  fee_details?: {
    amount?: number
    type?: string
  }[]
  id?: number | string
  metadata?: {
    orderId?: string
    productId?: string
    profileId?: string
    transactionId?: string
  }
  payer?: {
    email?: string
  }
  status?: string
  status_detail?: string
  transaction_amount?: number
}

export type CheckoutLineItem = {
  description?: null | string
  imageURL?: null | string
  productID: string
  quantity: number
  title: string
  unitPriceCOP: number
}

export type CheckoutBuyer = {
  email: string
  name?: null | string
  phone?: null | string
}

export function isMercadoPagoReadyForProfile(profile: null | Profile) {
  return Boolean(
    profile?.mercadoPagoConnection?.status === 'connected' &&
      profile?.mercadoPagoConnection?.encryptedAccessToken,
  )
}

/**
 * Mercado Pago does not answer 401 for a dead marketplace token.
 *
 * A revoked or expired OAuth access token comes back as a 403 with
 * `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`, so treating only 401 as "renew and
 * retry" would let a broken connection fail every checkout silently. A genuine
 * policy denial costs one extra refresh and then fails the same way, which is a
 * cheap price for catching the common case.
 */
function isCredentialFailure(status: number, body: string): boolean {
  if (status === 401) return true

  return status === 403 && /unauthorized|invalid[_ ]?token|forbidden/i.test(body)
}

function assertOk(response: Response, body: string, context: string): void {
  if (response.ok) return

  // Surfaced as its own type so `withMercadoPagoAccessToken` knows to renew and
  // try again instead of failing the checkout.
  if (isCredentialFailure(response.status, body)) {
    throw new MercadoPagoUnauthorizedError(`${context}: ${body}`)
  }

  throw new Error(`${context} (${response.status}): ${body}`)
}

/**
 * Creates the Mercado Pago checkout for one artist's slice of a cart.
 *
 * Built with the *artist's* access token and carrying `marketplace_fee`, which
 * is what makes this a split payment: Mercado Pago takes its own commission off
 * the gross, drops our fee into the oddsound account and settles the rest to the
 * artist.
 *
 * @see https://www.mercadopago.com.co/developers/es/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace
 */
export async function createMercadoPagoPreference({
  accessToken,
  buyer,
  items,
  order,
  platformFeeCOP,
  profile,
  shippingCOP,
  transaction,
}: {
  accessToken: string
  buyer: CheckoutBuyer
  items: CheckoutLineItem[]
  order: Order
  platformFeeCOP: number
  profile: Profile
  shippingCOP: number
  transaction: Transaction
}) {
  const serverURL = getServerSideURL()
  const webhookURL = `${serverURL}/creator-api/payments/mercadopago/webhook`
  const returnURL = `${serverURL}/cart`

  // Mercado Pago refuses `auto_return` unless the return URL is https, which
  // rules it out on a local http origin.
  const canAutoReturn = serverURL.startsWith('https://')

  const response = await fetch(`${MERCADO_PAGO_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      additional_info: `${profile.displayName || 'Artista'} · oddsound`,
      ...(canAutoReturn ? { auto_return: 'approved' } : {}),
      back_urls: {
        failure: `${returnURL}?payment=failed&order=${order.id}`,
        pending: `${returnURL}?payment=pending&order=${order.id}`,
        success: `${returnURL}?payment=success&order=${order.id}`,
      },
      expires: true,
      expiration_date_to: new Date(Date.now() + PREFERENCE_TTL_MS).toISOString(),
      external_reference: String(order.id),
      items: items.map((item) => ({
        currency_id: COP.code,
        description: item.description || undefined,
        id: item.productID,
        picture_url: item.imageURL || undefined,
        quantity: item.quantity,
        title: item.title,
        unit_price: item.unitPriceCOP,
      })),
      // Our cut. Mercado Pago moves it to the oddsound account at settlement.
      marketplace_fee: platformFeeCOP,
      metadata: {
        orderId: String(order.id),
        profileId: String(profile.id),
        transactionId: String(transaction.id),
      },
      notification_url: webhookURL,
      payer: {
        email: buyer.email,
        ...(buyer.name ? { name: buyer.name } : {}),
      },
      // Shipping rides as a separate line so it stays out of the commission base
      // — the artist pays to ship, so the artist keeps that part whole.
      ...(shippingCOP > 0
        ? {
            shipments: {
              cost: shippingCOP,
              mode: 'not_specified',
            },
          }
        : {}),
      statement_descriptor: 'ODDSOUND',
    }),
  })

  const body = await response.text()

  assertOk(response, body, 'Mercado Pago preference creation failed')

  return JSON.parse(body) as MercadoPagoPreferenceResponse
}

export async function fetchMercadoPagoPayment({
  accessToken,
  paymentID,
}: {
  accessToken: string
  paymentID: string
}) {
  const response = await fetch(`${MERCADO_PAGO_API_BASE}/v1/payments/${paymentID}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const body = await response.text()

  assertOk(response, body, 'Mercado Pago payment fetch failed')

  return JSON.parse(body) as MercadoPagoPaymentResponse
}

export function mapMercadoPagoPaymentToTransactionStatus(status?: null | string) {
  switch (status) {
    case 'approved':
      return 'succeeded' as const
    case 'rejected':
      return 'failed' as const
    case 'cancelled':
      return 'cancelled' as const
    case 'refunded':
      return 'refunded' as const
    default:
      return 'pending' as const
  }
}

export function mapMercadoPagoPaymentToOrderStatus(status?: null | string) {
  switch (status) {
    case 'approved':
      return 'completed' as const
    case 'cancelled':
    case 'rejected':
      return 'cancelled' as const
    case 'refunded':
      return 'refunded' as const
    default:
      return 'processing' as const
  }
}

export function resolveProcessorFeeAmountCOP(payment: MercadoPagoPaymentResponse) {
  return Math.round(
    (payment.fee_details || []).reduce((sum, detail) => sum + Number(detail.amount || 0), 0),
  )
}

export type { MercadoPagoPaymentResponse }
