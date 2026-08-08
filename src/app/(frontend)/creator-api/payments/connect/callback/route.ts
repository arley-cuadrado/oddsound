import config from '@payload-config'
import { getPayload } from 'payload'

import {
  buildConnectedMercadoPagoProfileUpdate,
  buildMercadoPagoConnectionErrorUpdate,
  exchangeMercadoPagoAuthorizationCode,
  fetchMercadoPagoSellerInfo,
  findCreatorProfileByOAuthState,
} from '@/utilities/mercadoPagoOAuth'
import { getServerSideURL } from '@/utilities/getURL'

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')
  const state = url.searchParams.get('state')

  if (!state) {
    return Response.redirect(`${getServerSideURL()}/creator/dashboard?payments=invalid-state`)
  }

  const profile = await findCreatorProfileByOAuthState({
    payload,
    state,
  })

  if (!profile) {
    return Response.redirect(`${getServerSideURL()}/creator/dashboard?payments=profile-not-found`)
  }

  if (error) {
    await payload.update({
      collection: 'profiles',
      id: String(profile.id),
      data: buildMercadoPagoConnectionErrorUpdate(errorDescription || error),
      depth: 0,
      overrideAccess: true,
    })

    return Response.redirect(`${getServerSideURL()}/creator/dashboard?payments=oauth-error`)
  }

  if (!code) {
    await payload.update({
      collection: 'profiles',
      id: String(profile.id),
      data: buildMercadoPagoConnectionErrorUpdate('Mercado Pago did not return an authorization code.'),
      depth: 0,
      overrideAccess: true,
    })

    return Response.redirect(`${getServerSideURL()}/creator/dashboard?payments=missing-code`)
  }

  try {
    const tokenData = await exchangeMercadoPagoAuthorizationCode(code)
    const sellerInfo = await fetchMercadoPagoSellerInfo(tokenData.access_token)

    await payload.update({
      collection: 'profiles',
      id: String(profile.id),
      data: buildConnectedMercadoPagoProfileUpdate({
        sellerInfo,
        tokenData,
      }),
      depth: 0,
      overrideAccess: true,
    })

    return Response.redirect(`${getServerSideURL()}/creator/dashboard?payments=connected`)
  } catch (caughtError) {
    await payload.update({
      collection: 'profiles',
      id: String(profile.id),
      data: buildMercadoPagoConnectionErrorUpdate(
        caughtError instanceof Error ? caughtError.message : 'Mercado Pago connection failed.',
      ),
      depth: 0,
      overrideAccess: true,
    })

    return Response.redirect(`${getServerSideURL()}/creator/dashboard?payments=failed`)
  }
}
