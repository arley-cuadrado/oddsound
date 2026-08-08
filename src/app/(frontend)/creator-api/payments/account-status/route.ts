import config from '@payload-config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { getMarketplaceSettings } from '@/utilities/marketplaceSettings'
import {
  findSellerPaymentAccountByOwner,
  sanitizeSellerPaymentAccount,
} from '@/utilities/marketplaceSellerAccounts'

export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return Response.json({ message: 'Authentication required.' }, { status: 401 })
  }

  const sellerAccount = await findSellerPaymentAccountByOwner({
    ownerID: String(user.id),
    payload,
  })
  const settings = await getMarketplaceSettings(payload)

  return Response.json({
    provider: settings.provider,
    sellerAccount: sanitizeSellerPaymentAccount(sellerAccount),
    settings: {
      checkoutCurrencyCode: settings.checkoutCurrencyCode,
      platformFeePercent: settings.platformFeePercent,
      shippingZones: settings.shippingZones.map((zone) => ({
        code: zone.code,
        estimatedBusinessDays: zone.estimatedBusinessDays,
        label: zone.label,
      })),
    },
  })
}
