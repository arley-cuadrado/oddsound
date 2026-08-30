import type { Payload } from 'payload'

import type { Profile as CreatorProfile, User as AppUser } from '@/payload-types'
import {
  getMercadoPagoOAuthConfig,
  MERCADO_PAGO_AUTH_URL,
  MERCADO_PAGO_OAUTH_TOKEN_URL,
  MERCADO_PAGO_USER_INFO_URL,
} from './mercadoPagoConfig'
import { describeConnectionHealth } from './mercadoPagoTokens'
import { decryptSecret, encryptSecret } from './secrets'

export { getMercadoPagoOAuthConfig }


type MercadoPagoProfileConnection = NonNullable<CreatorProfile['mercadoPagoConnection']>

type MercadoPagoOAuthTokenResponse = {
  access_token: string
  expires_in: number
  public_key?: string
  refresh_token?: string
  scope?: string
  user_id?: number | string
}

type MercadoPagoSellerInfo = {
  email?: string
  id?: number | string
  nickname?: string
}

export function buildMercadoPagoAuthorizationURL(state: string) {
  const { clientID, redirectURI } = getMercadoPagoOAuthConfig()
  const url = new URL(MERCADO_PAGO_AUTH_URL)

  url.searchParams.set('client_id', clientID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('platform_id', 'mp')
  url.searchParams.set('state', state)
  url.searchParams.set('redirect_uri', redirectURI)

  return url.toString()
}

export async function exchangeMercadoPagoAuthorizationCode(code: string) {
  const { clientID, clientSecret, redirectURI } = getMercadoPagoOAuthConfig()
  const response = await fetch(MERCADO_PAGO_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientID,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectURI,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Mercado Pago OAuth token exchange failed: ${message}`)
  }

  return (await response.json()) as MercadoPagoOAuthTokenResponse
}

export async function fetchMercadoPagoSellerInfo(accessToken: string) {
  const response = await fetch(MERCADO_PAGO_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Mercado Pago seller lookup failed: ${message}`)
  }

  return (await response.json()) as MercadoPagoSellerInfo
}

export async function findCreatorProfileByID({
  id,
  payload,
}: {
  id: string
  payload: Payload
}) {
  const profile = await payload.findByID({
    collection: 'profiles',
    id,
    depth: 0,
    overrideAccess: true,
  })

  return profile as CreatorProfile
}

export async function findCreatorProfileByOAuthState({
  payload,
  state,
}: {
  payload: Payload
  state: string
}) {
  const result = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      'mercadoPagoConnection.oauthState': {
        equals: state,
      },
    },
  })

  return (result.docs[0] as CreatorProfile | undefined) || null
}

/**
 * Everything about a connection that is safe to hand to the browser. The
 * encrypted tokens are deliberately absent.
 */
export function sanitizeMercadoPagoConnection(profile: CreatorProfile | null) {
  const connection = profile?.mercadoPagoConnection

  return {
    accessTokenExpiresAt: connection?.accessTokenExpiresAt || null,
    health: describeConnectionHealth(profile),
    lastConnectedAt: connection?.lastConnectedAt || null,
    lastError: connection?.lastError || null,
    lastRefreshedAt: connection?.lastRefreshedAt || null,
    sellerEmail: connection?.sellerEmail || null,
    sellerID: connection?.sellerID || null,
    sellerNickname: connection?.sellerNickname || null,
    status: connection?.status || 'not_connected',
  }
}

export type SanitizedMercadoPagoConnection = ReturnType<typeof sanitizeMercadoPagoConnection>

/**
 * Reads the stored token without checking whether it is still alive.
 *
 * Prefer `getValidMercadoPagoAccessToken` or `withMercadoPagoAccessToken` from
 * `mercadoPagoTokens`: those renew first and retry on a 401. This one exists for
 * the webhook, which is handed a payment ID by Mercado Pago and only needs to
 * read it back.
 */
export function getDecryptedMercadoPagoAccessToken(profile: CreatorProfile) {
  return decryptSecret(profile.mercadoPagoConnection?.encryptedAccessToken)
}

export function buildConnectedMercadoPagoProfileUpdate({
  sellerInfo,
  tokenData,
}: {
  sellerInfo: MercadoPagoSellerInfo
  tokenData: MercadoPagoOAuthTokenResponse
}) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + (tokenData.expires_in || 0) * 1000)

  return {
    mercadoPagoConnection: {
      accessTokenExpiresAt: expiresAt.toISOString(),
      encryptedAccessToken: encryptSecret(tokenData.access_token),
      encryptedRefreshToken: tokenData.refresh_token
        ? encryptSecret(tokenData.refresh_token)
        : undefined,
      lastConnectedAt: now.toISOString(),
      lastError: '',
      lastRefreshedAt: now.toISOString(),
      oauthState: '',
      // A fresh authorisation supersedes any earlier grant, so the recovery
      // copy and the failure tally start over with it.
      previousEncryptedRefreshToken: '',
      refreshFailureCount: 0,
      sellerEmail: sellerInfo.email || '',
      sellerID: String(sellerInfo.id || tokenData.user_id || ''),
      sellerNickname: sellerInfo.nickname || '',
      status: 'connected',
    } satisfies Partial<MercadoPagoProfileConnection>,
  } satisfies Pick<CreatorProfile, 'mercadoPagoConnection'>
}

export function buildMercadoPagoConnectionErrorUpdate(message: string) {
  return {
    mercadoPagoConnection: {
      lastError: message,
      status: 'action_required',
    } satisfies Partial<MercadoPagoProfileConnection>,
  } satisfies Pick<CreatorProfile, 'mercadoPagoConnection'>
}

export async function resolveCreatorProfileForUser({
  payload,
  user,
}: {
  payload: Payload
  user: AppUser
}) {
  const inlineProfileID =
    typeof user.profile === 'string' ? user.profile : user.profile?.id ? String(user.profile.id) : null

  if (!inlineProfileID) return null

  return findCreatorProfileByID({
    id: inlineProfileID,
    payload,
  })
}
