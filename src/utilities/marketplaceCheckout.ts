import type { Payload } from 'payload'

import type { Product } from '@/payload-types'
import { getMarketplaceSettings } from './marketplaceSettings'
import { resolveShippingAmountCOP, type ShippingQuoteInput } from './marketplaceShipping'
import { findSellerPaymentAccountByProfile, sanitizeSellerPaymentAccount } from './marketplaceSellerAccounts'

export async function getPublishedCommerceProductByID({
  id,
  payload,
}: {
  id: string
  payload: Payload
}): Promise<null | Product> {
  const product = (await payload.findByID({
    collection: 'products',
    id,
    depth: 1,
    overrideAccess: true,
  }).catch(() => null)) as Product | null

  if (!product || product._status !== 'published') {
    return null
  }

  return product
}

export function resolveProductCheckoutSubtotalCOP({
  product,
  quantity,
  usdToCopRate,
}: {
  product: Product
  quantity: number
  usdToCopRate: number
}) {
  if (typeof product.priceInUSD !== 'number' || product.priceInUSD <= 0) {
    throw new Error('Product has no valid priceInUSD amount configured.')
  }

  const unitAmountCOP = Math.round(product.priceInUSD * usdToCopRate)

  return {
    quantity,
    subtotalCOP: unitAmountCOP * quantity,
    unitAmountCOP,
  }
}

export async function quoteMarketplaceCheckout({
  payload,
  product,
  quantity,
  shippingAddress,
}: {
  payload: Payload
  product: Product
  quantity: number
  shippingAddress?: ShippingQuoteInput
}) {
  const settings = await getMarketplaceSettings(payload)
  const profileID =
    typeof product.profile === 'string' ? product.profile : product.profile?.id || null
  const sellerAccount = await findSellerPaymentAccountByProfile({
    payload,
    profileID,
  })

  const { subtotalCOP, unitAmountCOP } = resolveProductCheckoutSubtotalCOP({
    product,
    quantity,
    usdToCopRate: settings.usdToCopRate,
  })

  const shippingQuote = resolveShippingAmountCOP({
    product,
    settings,
    shippingAddress: shippingAddress || {},
    subtotalCOP,
  })
  const platformFeeAmountCOP = Math.round((subtotalCOP * settings.platformFeePercent) / 100)
  const totalAmountCOP = subtotalCOP + shippingQuote.amountCOP

  return {
    currencyCode: settings.checkoutCurrencyCode,
    product: {
      id: product.id,
      requiresShipping: product.productType !== 'digital' && product.requiresShipping !== false,
      title: product.title || 'Producto',
    },
    quantity,
    sellerAccount: sanitizeSellerPaymentAccount(sellerAccount),
    shipping: {
      amountCOP: shippingQuote.amountCOP,
      estimatedBusinessDays: shippingQuote.estimatedBusinessDays,
      zoneCode: shippingQuote.zone?.code || null,
      zoneLabel: shippingQuote.zone?.label || null,
    },
    subtotalCOP,
    totals: {
      artistNetAmountCOP: totalAmountCOP - platformFeeAmountCOP,
      platformFeeAmountCOP,
      totalAmountCOP,
      unitAmountCOP,
    },
  }
}

export function canUseMarketplaceCheckout({
  checkoutProvider,
  externalCheckoutURL,
  sellerAccount,
}: {
  checkoutProvider?: null | string
  externalCheckoutURL?: null | string
  sellerAccount?: null | { accountStatus?: null | string; canReceivePayments?: boolean }
}) {
  if (checkoutProvider !== 'mercadopago') return false
  if (externalCheckoutURL) return false

  return Boolean(
    sellerAccount &&
      sellerAccount.accountStatus === 'connected' &&
      sellerAccount.canReceivePayments === true,
  )
}
