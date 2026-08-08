import config from '@payload-config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { buildMercadoPagoOAuthURL } from '@/utilities/mercadoPago'
import { findSellerPaymentAccountByOwner } from '@/utilities/marketplaceSellerAccounts'
import { resolveUserProfileID } from '@/utilities/commerceProducts'

export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return Response.redirect(new URL('/creator/login', requestHeaders.get('origin') || 'http://localhost:3000'))
  }

  const profileID = resolveUserProfileID(user as never)

  if (!profileID) {
    return Response.json({ message: 'No creator profile found for this user.' }, { status: 400 })
  }

  const existing = await findSellerPaymentAccountByOwner({
    ownerID: String(user.id),
    payload,
  })
  const oauthState = crypto.randomUUID()

  const sellerAccount =
    existing ||
    (await payload.create({
      collection: 'seller-payment-accounts',
      data: {
        accountStatus: 'pending',
        canReceivePayments: false,
        kycStatus: 'unknown',
        owner: user.id,
        profile: profileID,
        provider: 'mercadopago',
      },
      draft: false,
      overrideAccess: true,
    }))

  await payload.update({
    collection: 'seller-payment-accounts',
    id: sellerAccount.id,
    data: {
      accountStatus: 'pending',
      lastError: null,
      oauthRevokedAt: null,
      oauthState,
    },
    overrideAccess: true,
  })

  return Response.redirect(buildMercadoPagoOAuthURL(oauthState))
}
