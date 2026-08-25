import type { Payload } from 'payload'

import type { Order, Product, Profile, Transaction } from '@/payload-types'
import { getServerSideURL } from './getURL'
import { getDecryptedMercadoPagoAccessToken } from './mercadoPagoOAuth'

const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com'

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
  status?: string
  status_detail?: string
  transaction_amount?: number
}

function getMarketplaceConfig() {
  return {
    platformFeePercent: Number(process.env.MARKETPLACE_PLATFORM_FEE_PERCENT || '12'),
    usdToCopRate: Number(process.env.MARKETPLACE_USD_TO_COP_RATE || '4000'),
    webhookToken: process.env.MERCADOPAGO_WEBHOOK_TOKEN || '',
  }
}

export function isMercadoPagoReadyForProfile(profile: null | Profile) {
  return Boolean(
    profile?.mercadoPagoConnection?.status === 'connected' &&
      profile?.mercadoPagoConnection?.encryptedAccessToken,
  )
}

export function resolveProductPricing(product: Product) {
  const { platformFeePercent, usdToCopRate } = getMarketplaceConfig()

  if (typeof product.priceInUSD !== 'number' || product.priceInUSD <= 0) {
    throw new Error('This product does not have a valid USD price configured.')
  }

  const subtotalCOP = Math.round(product.priceInUSD * usdToCopRate)
  const platformFeeAmountCOP = Math.round((subtotalCOP * platformFeePercent) / 100)
  const artistNetAmountCOP = subtotalCOP - platformFeeAmountCOP

  return {
    artistNetAmountCOP,
    platformFeeAmountCOP,
    subtotalCOP,
    usdAmount: product.priceInUSD,
    usdToCopRate,
  }
}

export async function createMercadoPagoPreference({
  order,
  product,
  profile,
  transaction,
}: {
  order: Order
  product: Product
  profile: Profile
  transaction: Transaction
}) {
  const accessToken = getDecryptedMercadoPagoAccessToken(profile)

  if (!accessToken) {
    throw new Error('Seller Mercado Pago access token is missing.')
  }

  const { platformFeeAmountCOP, subtotalCOP } = resolveProductPricing(product)
  const webhookURL = new URL(`${getServerSideURL()}/creator-api/payments/mercadopago/webhook`)
  const { webhookToken } = getMarketplaceConfig()

  if (webhookToken) {
    webhookURL.searchParams.set('token', webhookToken)
  }

  const successBaseURL = `${getServerSideURL()}/${profile.slug}/shop`
  const response = await fetch(`${MERCADO_PAGO_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      additional_info: `${profile.displayName || 'Artist'} - ${product.title || 'Product'}`,
      auto_return: 'approved',
      back_urls: {
        failure: `${successBaseURL}?payment=failed`,
        pending: `${successBaseURL}?payment=pending`,
        success: `${successBaseURL}?payment=success`,
      },
      external_reference: String(order.id),
      items: [
        {
          currency_id: 'COP',
          description: product.description || undefined,
          id: String(product.id),
          quantity: 1,
          title: product.title || 'Producto',
          unit_price: subtotalCOP,
        },
      ],
      marketplace_fee: platformFeeAmountCOP,
      metadata: {
        orderId: String(order.id),
        productId: String(product.id),
        profileId: String(profile.id),
        transactionId: String(transaction.id),
      },
      notification_url: webhookURL.toString(),
      statement_descriptor: 'ODDSOUND',
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Mercado Pago preference creation failed: ${message}`)
  }

  return (await response.json()) as MercadoPagoPreferenceResponse
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

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Mercado Pago payment fetch failed: ${message}`)
  }

  return (await response.json()) as MercadoPagoPaymentResponse
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

