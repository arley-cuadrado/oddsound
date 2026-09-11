import crypto from 'crypto'
import config from '@payload-config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { ensureCreatorProfile } from '@/utilities/creatorProfiles'
import {
  buildMercadoPagoAuthorizationURL,
  buildMercadoPagoConnectionErrorUpdate,
  findCreatorProfileByID,
  getMercadoPagoOAuthConfig,
} from '@/utilities/mercadoPagoOAuth'
import { getServerSideURL } from '@/utilities/getURL'

export async function GET() {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return Response.redirect(`${getServerSideURL()}/dashboard/login`)
  }

  try {
    getMercadoPagoOAuthConfig()
  } catch (error) {
    const profileID = await ensureCreatorProfile({
      payload,
      user: {
        accountType: user.accountType,
        email: user.email,
        id: String(user.id),
        name: user.name,
        profile: user.profile,
        role: user.role,
      },
    })

    if (profileID) {
      await payload.update({
        collection: 'profiles',
        id: String(profileID),
        data: buildMercadoPagoConnectionErrorUpdate(
          error instanceof Error ? error.message : 'Mercado Pago is not configured yet.',
        ),
        depth: 0,
        overrideAccess: true,
      })
    }

    return Response.redirect(`${getServerSideURL()}/creator/dashboard?payments=missing-config`)
  }

  const profileID = await ensureCreatorProfile({
    payload,
    user: {
      accountType: user.accountType,
      email: user.email,
      id: String(user.id),
      name: user.name,
      profile: user.profile,
      role: user.role,
    },
  })

  if (!profileID) {
    return Response.redirect(`${getServerSideURL()}/creator/dashboard?payments=no-profile`)
  }

  await findCreatorProfileByID({
    id: String(profileID),
    payload,
  })

  const oauthState = crypto.randomUUID()

  await payload.update({
    collection: 'profiles',
    id: String(profileID),
    data: {
      mercadoPagoConnection: {
        lastError: '',
        oauthState,
        status: 'connecting',
      },
    },
    depth: 0,
    overrideAccess: true,
  })

  return Response.redirect(buildMercadoPagoAuthorizationURL(oauthState))
}
