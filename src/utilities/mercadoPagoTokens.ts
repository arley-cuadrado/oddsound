import type { Payload } from 'payload'

import type { Profile } from '@/payload-types'
import { getMercadoPagoOAuthConfig, MERCADO_PAGO_OAUTH_TOKEN_URL } from './mercadoPagoConfig'
import { decryptSecret, encryptSecret } from './secrets'

const DAY_MS = 24 * 60 * 60 * 1000

/** Mercado Pago issues marketplace access tokens with a six month life. */
export const TOKEN_LIFETIME_DAYS = 180

/**
 * Renew once a token is a month old rather than waiting for it to be nearly
 * dead. With a 180 day life and a 30 day cycle it takes five consecutive failed
 * runs before anything actually expires, and one HTTP call per artist per month
 * costs nothing.
 */
const RENEW_WHEN_REMAINING_MS = (TOKEN_LIFETIME_DAYS - 30) * DAY_MS

/** The floor below which we refuse to start a checkout without renewing first. */
const JIT_RENEW_WHEN_REMAINING_MS = 30 * DAY_MS

const LOCK_TTL_MS = 60_000
const LOCK_WAIT_ATTEMPTS = 20
const LOCK_WAIT_INTERVAL_MS = 300

/**
 * If a refresh fails but somebody else refreshed this recently, we lost a race
 * rather than losing the connection.
 */
const RECENT_REFRESH_WINDOW_MS = 90_000

type MercadoPagoConnection = NonNullable<Profile['mercadoPagoConnection']>

type RefreshTokenResponse = {
  access_token: string
  expires_in?: number
  refresh_token?: string
}

/** Thrown when Mercado Pago rejects a token that we believed was still valid. */
export class MercadoPagoUnauthorizedError extends Error {
  constructor(message = 'Mercado Pago rejected the access token.') {
    super(message)
    this.name = 'MercadoPagoUnauthorizedError'
  }
}

/** Thrown when only the artist can fix it by authorising the app again. */
export class MercadoPagoReconnectRequiredError extends Error {
  constructor(message = 'La conexión con Mercado Pago debe renovarse manualmente.') {
    super(message)
    this.name = 'MercadoPagoReconnectRequiredError'
  }
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function toDate(value: null | string | undefined): Date | null {
  if (!value) return null

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getConnection(profile: null | Profile | undefined): MercadoPagoConnection | null {
  return profile?.mercadoPagoConnection || null
}

function remainingLifetimeMs(profile: null | Profile | undefined): number {
  const expiresAt = toDate(getConnection(profile)?.accessTokenExpiresAt)

  // No expiry recorded means we cannot vouch for the token, so treat it as due.
  if (!expiresAt) return 0

  return expiresAt.getTime() - Date.now()
}

export function isDueForProactiveRefresh(profile: null | Profile | undefined): boolean {
  const connection = getConnection(profile)

  if (connection?.status !== 'connected' || !connection.encryptedRefreshToken) return false

  return remainingLifetimeMs(profile) < RENEW_WHEN_REMAINING_MS
}

export type ConnectionHealth = {
  daysRemaining: null | number
  /** 0–1, how much of the token's life is left. Drives the dashboard meter. */
  lifetimeRatio: number
  state: 'action_required' | 'connected' | 'expired' | 'expiring' | 'not_connected'
}

export function describeConnectionHealth(profile: null | Profile | undefined): ConnectionHealth {
  const connection = getConnection(profile)
  const status = connection?.status || 'not_connected'

  if (status !== 'connected') {
    return {
      daysRemaining: null,
      lifetimeRatio: 0,
      state: status === 'action_required' ? 'action_required' : 'not_connected',
    }
  }

  const remaining = remainingLifetimeMs(profile)
  const daysRemaining = Math.floor(remaining / DAY_MS)
  const lifetimeRatio = Math.min(1, Math.max(0, remaining / (TOKEN_LIFETIME_DAYS * DAY_MS)))

  if (remaining <= 0) return { daysRemaining: 0, lifetimeRatio: 0, state: 'expired' }
  if (remaining < JIT_RENEW_WHEN_REMAINING_MS) {
    return { daysRemaining, lifetimeRatio, state: 'expiring' }
  }

  return { daysRemaining, lifetimeRatio, state: 'connected' }
}

async function readProfile(payload: Payload, profileID: string): Promise<Profile> {
  return (await payload.findByID({
    collection: 'profiles',
    id: profileID,
    depth: 0,
    overrideAccess: true,
  })) as Profile
}

function getProfileModel(payload: Payload) {
  return payload.db.collections?.profiles
}

/**
 * Claims the right to renew this profile's token, atomically.
 *
 * The refresh token is single use and rotates, so two checkouts landing on the
 * same artist in the same second could otherwise both spend it and leave the
 * connection dead. Payload's update-by-where is a find followed by writes, which
 * is not atomic, so this drops to the Mongo model for a real compare-and-set.
 *
 * A `false` here is not fatal — `refreshMercadoPagoConnection` waits for the
 * winner, and the invalid_grant recovery below covers the case where the lock
 * could not be taken at all.
 */
async function acquireRefreshLock(payload: Payload, profileID: string): Promise<boolean> {
  const model = getProfileModel(payload)

  if (!model) return true

  const now = new Date()
  const staleBefore = new Date(now.getTime() - LOCK_TTL_MS)

  try {
    const claimed = await model.findOneAndUpdate(
      {
        _id: profileID,
        $or: [
          { 'mercadoPagoConnection.refreshLockedAt': { $exists: false } },
          { 'mercadoPagoConnection.refreshLockedAt': null },
          { 'mercadoPagoConnection.refreshLockedAt': { $lt: staleBefore } },
        ],
      },
      { $set: { 'mercadoPagoConnection.refreshLockedAt': now } },
      { lean: true, new: true },
    )

    return Boolean(claimed)
  } catch {
    return true
  }
}

async function releaseRefreshLock(payload: Payload, profileID: string): Promise<void> {
  const model = getProfileModel(payload)

  if (!model) return

  try {
    await model.updateOne(
      { _id: profileID },
      { $unset: { 'mercadoPagoConnection.refreshLockedAt': '' } },
    )
  } catch {
    // A stranded lock expires on its own after LOCK_TTL_MS.
  }
}

async function requestTokenRefresh(refreshToken: string): Promise<RefreshTokenResponse> {
  const { clientID, clientSecret } = getMercadoPagoOAuthConfig()

  const response = await fetch(MERCADO_PAGO_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientID,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  const body = await response.text()

  if (!response.ok) {
    // 4xx means the grant itself is gone — spent, revoked from the seller's
    // Mercado Pago account, or expired. Retrying cannot bring it back.
    if (response.status >= 400 && response.status < 500) {
      throw new MercadoPagoReconnectRequiredError(
        `Mercado Pago rechazó la renovación (${response.status}): ${body}`,
      )
    }

    throw new Error(`Mercado Pago token refresh failed (${response.status}): ${body}`)
  }

  const parsed = JSON.parse(body) as RefreshTokenResponse

  if (!parsed.access_token) {
    throw new Error('Mercado Pago returned a refresh response without an access token.')
  }

  return parsed
}

async function persistRefreshedTokens({
  payload,
  previousRefreshToken,
  profileID,
  tokenData,
}: {
  payload: Payload
  previousRefreshToken: string
  profileID: string
  tokenData: RefreshTokenResponse
}): Promise<void> {
  const now = new Date()
  const lifetimeSeconds = tokenData.expires_in || TOKEN_LIFETIME_DAYS * 24 * 60 * 60

  await payload.update({
    collection: 'profiles',
    id: profileID,
    context: { disableRevalidate: true },
    data: {
      mercadoPagoConnection: {
        accessTokenExpiresAt: new Date(now.getTime() + lifetimeSeconds * 1000).toISOString(),
        encryptedAccessToken: encryptSecret(tokenData.access_token),
        // Mercado Pago rotates the refresh token on every renewal. If it did not
        // send a new one, the one we just used is still the current one.
        encryptedRefreshToken: tokenData.refresh_token
          ? encryptSecret(tokenData.refresh_token)
          : encryptSecret(previousRefreshToken),
        lastError: '',
        lastRefreshAttemptAt: now.toISOString(),
        lastRefreshedAt: now.toISOString(),
        previousEncryptedRefreshToken: encryptSecret(previousRefreshToken),
        refreshFailureCount: 0,
        status: 'connected',
      },
    },
    depth: 0,
    overrideAccess: true,
  })
}

async function recordRefreshFailure({
  message,
  payload,
  permanent,
  profile,
}: {
  message: string
  payload: Payload
  permanent: boolean
  profile: Profile
}): Promise<void> {
  const connection = getConnection(profile)

  await payload.update({
    collection: 'profiles',
    id: String(profile.id),
    context: { disableRevalidate: true },
    data: {
      mercadoPagoConnection: {
        lastError: message,
        lastRefreshAttemptAt: new Date().toISOString(),
        refreshFailureCount: (connection?.refreshFailureCount || 0) + 1,
        // A transient failure keeps the connection usable: the token we hold has
        // not expired yet, it just could not be renewed this time.
        ...(permanent ? { status: 'action_required' as const } : {}),
      },
    },
    depth: 0,
    overrideAccess: true,
  })
}

function readRefreshToken(profile: Profile): string {
  const connection = getConnection(profile)

  return (
    decryptSecret(connection?.encryptedRefreshToken) ||
    decryptSecret(connection?.previousEncryptedRefreshToken)
  )
}

function refreshedRecently(profile: Profile): boolean {
  const lastRefreshedAt = toDate(getConnection(profile)?.lastRefreshedAt)

  if (!lastRefreshedAt) return false

  return Date.now() - lastRefreshedAt.getTime() < RECENT_REFRESH_WINDOW_MS
}

/**
 * Waits for whoever holds the lock to finish, then returns their fresh token.
 * Returns null if the wait ran out, in which case the caller renews anyway —
 * a duplicate attempt is recoverable, a stuck checkout is not.
 */
async function waitForConcurrentRefresh(
  payload: Payload,
  profileID: string,
): Promise<null | string> {
  for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt += 1) {
    await wait(LOCK_WAIT_INTERVAL_MS)

    const profile = await readProfile(payload, profileID)
    const connection = getConnection(profile)

    if (!connection?.refreshLockedAt && refreshedRecently(profile)) {
      const token = decryptSecret(connection?.encryptedAccessToken)

      if (token) return token
    }

    if (connection?.status === 'action_required') {
      throw new MercadoPagoReconnectRequiredError(connection.lastError || undefined)
    }
  }

  return null
}

/**
 * Renews the artist's Mercado Pago credentials and returns the new access token.
 */
export async function refreshMercadoPagoConnection({
  payload,
  profileID,
}: {
  payload: Payload
  profileID: string
}): Promise<string> {
  const locked = await acquireRefreshLock(payload, profileID)

  if (!locked) {
    const token = await waitForConcurrentRefresh(payload, profileID)

    if (token) return token
  }

  try {
    const profile = await readProfile(payload, profileID)
    const refreshToken = readRefreshToken(profile)

    if (!refreshToken) {
      await recordRefreshFailure({
        message: 'No hay un refresh token guardado para esta cuenta.',
        payload,
        permanent: true,
        profile,
      })

      throw new MercadoPagoReconnectRequiredError()
    }

    try {
      const tokenData = await requestTokenRefresh(refreshToken)

      await persistRefreshedTokens({
        payload,
        previousRefreshToken: refreshToken,
        profileID,
        tokenData,
      })

      return tokenData.access_token
    } catch (error) {
      const permanent = error instanceof MercadoPagoReconnectRequiredError

      if (permanent) {
        // Losing the race looks exactly like a dead grant, because the winner
        // already spent this refresh token. Re-read before condemning it.
        const latest = await readProfile(payload, profileID)

        if (refreshedRecently(latest)) {
          const token = decryptSecret(getConnection(latest)?.encryptedAccessToken)

          if (token) return token
        }
      }

      await recordRefreshFailure({
        message: error instanceof Error ? error.message : 'Fallo al renovar el token.',
        payload,
        permanent,
        profile,
      })

      throw error
    }
  } finally {
    await releaseRefreshLock(payload, profileID)
  }
}

/**
 * The only supported way to get an artist's access token. Renews first when the
 * token is inside its last month, so a checkout never starts on a token that
 * might die mid-flight.
 */
export async function getValidMercadoPagoAccessToken({
  payload,
  profile,
}: {
  payload: Payload
  profile: Profile
}): Promise<string> {
  const connection = getConnection(profile)

  if (!connection?.encryptedAccessToken) {
    throw new MercadoPagoReconnectRequiredError('Esta cuenta no tiene Mercado Pago conectado.')
  }

  if (remainingLifetimeMs(profile) < JIT_RENEW_WHEN_REMAINING_MS) {
    return refreshMercadoPagoConnection({ payload, profileID: String(profile.id) })
  }

  return decryptSecret(connection.encryptedAccessToken)
}

/**
 * Runs a Mercado Pago call with a valid token and, if Mercado Pago still says
 * 401, renews once and runs it again.
 *
 * This is the layer that covers what an expiry date cannot: a seller revoking
 * the app from their own Mercado Pago account, or Mercado Pago rotating
 * credentials on their side. Only a 401 reveals those.
 */
export async function withMercadoPagoAccessToken<T>({
  payload,
  profile,
  run,
}: {
  payload: Payload
  profile: Profile
  run: (accessToken: string) => Promise<T>
}): Promise<T> {
  const accessToken = await getValidMercadoPagoAccessToken({ payload, profile })

  try {
    return await run(accessToken)
  } catch (error) {
    if (!(error instanceof MercadoPagoUnauthorizedError)) throw error

    const refreshed = await refreshMercadoPagoConnection({
      payload,
      profileID: String(profile.id),
    })

    return run(refreshed)
  }
}

/** Profiles whose token is old enough that the scheduled job should renew it. */
export async function findConnectionsDueForRefresh(payload: Payload): Promise<Profile[]> {
  const dueBefore = new Date(Date.now() + RENEW_WHEN_REMAINING_MS).toISOString()

  const result = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 500,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { 'mercadoPagoConnection.status': { equals: 'connected' } },
        { 'mercadoPagoConnection.accessTokenExpiresAt': { less_than: dueBefore } },
      ],
    },
  })

  return result.docs as Profile[]
}
