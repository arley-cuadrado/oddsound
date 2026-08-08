import config from '@payload-config'
import { getPayload } from 'payload'

import { decryptSecret, encryptSecret } from '@/utilities/secrets'
import { exchangeMercadoPagoCode, getMercadoPagoSeller } from '@/utilities/mercadoPago'
import { getServerSideURL } from '@/utilities/getURL'

function redirectToDashboard(path: string) {
  return Response.redirect(new URL(path, getServerSideURL()))
}

export async function GET(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (!state) {
    return redirectToDashboard('/creator/dashboard?payments=missing-state')
  }

  const sellerAccountResult = await payload.find({
    collection: 'seller-payment-accounts',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      oauthState: {
        equals: state,
      },
    },
  })
  const sellerAccount = sellerAccountResult.docs[0]

  if (!sellerAccount) {
    return redirectToDashboard('/creator/dashboard?payments=unknown-state')
  }

  if (oauthError || !code) {
    await payload.update({
      collection: 'seller-payment-accounts',
      id: sellerAccount.id,
      data: {
        accountStatus: 'restricted',
        lastError: oauthError || 'Missing authorization code from Mercado Pago.',
      },
      overrideAccess: true,
    })

    return redirectToDashboard('/creator/dashboard?payments=denied')
  }

  try {
    const tokens = await exchangeMercadoPagoCode(code)
    const seller = await getMercadoPagoSeller(tokens.access_token)

    await payload.update({
      collection: 'seller-payment-accounts',
      id: sellerAccount.id,
      data: {
        accessTokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        accountStatus: 'connected',
        canReceivePayments: true,
        encryptedAccessToken: encryptSecret(tokens.access_token),
        encryptedRefreshToken: encryptSecret(tokens.refresh_token),
        kycStatus: 'unknown',
        lastError: null,
        lastSyncedAt: new Date().toISOString(),
        oauthConnectedAt: new Date().toISOString(),
        oauthScope: tokens.scope || null,
        oauthState: null,
        providerSellerEmail: seller.email || null,
        providerSellerID: seller.id ? String(seller.id) : null,
        providerSellerNickname: seller.nickname || null,
      },
      overrideAccess: true,
    })

    return redirectToDashboard('/creator/dashboard?payments=connected')
  } catch (error) {
    await payload.update({
      collection: 'seller-payment-accounts',
      id: sellerAccount.id,
      data: {
        accountStatus: 'restricted',
        canReceivePayments: false,
        lastError: error instanceof Error ? error.message : 'Unknown Mercado Pago connection error.',
      },
      overrideAccess: true,
    })

    return redirectToDashboard('/creator/dashboard?payments=error')
  }
}
