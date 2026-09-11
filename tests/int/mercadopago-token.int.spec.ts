import type { Payload } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Profile } from '@/payload-types'
import {
  describeConnectionHealth,
  getValidMercadoPagoAccessToken,
  isDueForProactiveRefresh,
  MercadoPagoReconnectRequiredError,
  MercadoPagoUnauthorizedError,
  refreshMercadoPagoConnection,
  withMercadoPagoAccessToken,
} from '@/utilities/mercadoPagoTokens'
import { decryptSecret, encryptSecret } from '@/utilities/secrets'

const DAY_MS = 24 * 60 * 60 * 1000

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY_MS).toISOString()
}

function buildProfile(connection: Record<string, unknown> = {}): Profile {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    displayName: 'Artista',
    id: 'profile-1',
    mercadoPagoConnection: {
      accessTokenExpiresAt: daysFromNow(170),
      encryptedAccessToken: encryptSecret('access-old'),
      encryptedRefreshToken: encryptSecret('refresh-old'),
      refreshFailureCount: 0,
      status: 'connected',
      ...connection,
    },
    owner: 'user-1',
    slug: 'artista',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as unknown as Profile
}

/**
 * An in-memory stand-in for Payload plus the Mongo model the refresh lock uses.
 * Only the handful of operations the token module touches are implemented.
 */
function createFakePayload(profile: Profile) {
  const state = { profile: JSON.parse(JSON.stringify(profile)) as Profile }

  const model = {
    findOneAndUpdate: async (query: any, update: any) => {
      const current = state.profile.mercadoPagoConnection?.refreshLockedAt
      const staleBefore = query.$or?.[2]?.['mercadoPagoConnection.refreshLockedAt']?.$lt
      const free = !current || (staleBefore && new Date(current) < new Date(staleBefore))

      if (!free) return null

      state.profile.mercadoPagoConnection = {
        ...state.profile.mercadoPagoConnection,
        refreshLockedAt: new Date(
          update.$set['mercadoPagoConnection.refreshLockedAt'],
        ).toISOString(),
      }

      return state.profile
    },
    updateOne: async () => {
      state.profile.mercadoPagoConnection = {
        ...state.profile.mercadoPagoConnection,
        refreshLockedAt: null,
      }
    },
  }

  const payload = {
    db: { collections: { profiles: model } },
    findByID: async () => JSON.parse(JSON.stringify(state.profile)) as Profile,
    logger: { error: () => {}, info: () => {}, warn: () => {} },
    update: async ({ data }: { data: any }) => {
      state.profile.mercadoPagoConnection = {
        ...state.profile.mercadoPagoConnection,
        ...data.mercadoPagoConnection,
      }

      return JSON.parse(JSON.stringify(state.profile)) as Profile
    },
  }

  return { payload: payload as unknown as Payload, state }
}

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

function errorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    text: async () => body,
  } as unknown as Response
}

describe('Mercado Pago token lifecycle', () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_CLIENT_ID = 'client-id'
    process.env.MERCADOPAGO_CLIENT_SECRET = 'client-secret'
    process.env.MARKETPLACE_TOKEN_ENCRYPTION_KEY = 'a-long-enough-test-encryption-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('leaves a young token alone', async () => {
    const { payload, state } = createFakePayload(buildProfile())
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const token = await getValidMercadoPagoAccessToken({
      payload,
      profile: state.profile,
    })

    expect(token).toBe('access-old')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renews before a token enters its last month', async () => {
    const { payload, state } = createFakePayload(
      buildProfile({ accessTokenExpiresAt: daysFromNow(20) }),
    )

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        okResponse({ access_token: 'access-new', expires_in: 15552000, refresh_token: 'refresh-new' }),
      )

    const token = await getValidMercadoPagoAccessToken({ payload, profile: state.profile })

    expect(token).toBe('access-new')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(decryptSecret(state.profile.mercadoPagoConnection?.encryptedAccessToken)).toBe(
      'access-new',
    )
  })

  it('stores the rotated refresh token and keeps the previous one as a fallback', async () => {
    const { payload, state } = createFakePayload(
      buildProfile({ accessTokenExpiresAt: daysFromNow(10) }),
    )

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ access_token: 'access-new', expires_in: 15552000, refresh_token: 'refresh-new' }),
    )

    await refreshMercadoPagoConnection({ payload, profileID: 'profile-1' })

    const connection = state.profile.mercadoPagoConnection

    expect(decryptSecret(connection?.encryptedRefreshToken)).toBe('refresh-new')
    expect(decryptSecret(connection?.previousEncryptedRefreshToken)).toBe('refresh-old')
    expect(connection?.refreshFailureCount).toBe(0)
    expect(connection?.lastRefreshedAt).toBeTruthy()
  })

  it('lets two simultaneous checkouts share a single renewal', async () => {
    const { payload, state } = createFakePayload(
      buildProfile({ accessTokenExpiresAt: daysFromNow(5) }),
    )

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        okResponse({ access_token: 'access-new', expires_in: 15552000, refresh_token: 'refresh-new' }),
      )

    const [first, second] = await Promise.all([
      refreshMercadoPagoConnection({ payload, profileID: 'profile-1' }),
      refreshMercadoPagoConnection({ payload, profileID: 'profile-1' }),
    ])

    // The refresh token is single use: spending it twice would kill the
    // connection outright.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(first).toBe('access-new')
    expect(second).toBe('access-new')
    expect(state.profile.mercadoPagoConnection?.refreshLockedAt).toBeFalsy()
  })

  it('renews once and retries when Mercado Pago answers 401', async () => {
    const { payload, state } = createFakePayload(buildProfile())

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        okResponse({ access_token: 'access-new', expires_in: 15552000, refresh_token: 'refresh-new' }),
      )

    const attempts: string[] = []

    const result = await withMercadoPagoAccessToken({
      payload,
      profile: state.profile,
      run: async (accessToken) => {
        attempts.push(accessToken)

        if (attempts.length === 1) {
          throw new MercadoPagoUnauthorizedError()
        }

        return 'preference-created'
      },
    })

    expect(result).toBe('preference-created')
    expect(attempts).toEqual(['access-old', 'access-new'])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('asks the artist to reconnect when the grant is gone, without destroying the stored token', async () => {
    const { payload, state } = createFakePayload(
      buildProfile({ accessTokenExpiresAt: daysFromNow(3) }),
    )

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      errorResponse(400, '{"error":"invalid_grant"}'),
    )

    await expect(
      refreshMercadoPagoConnection({ payload, profileID: 'profile-1' }),
    ).rejects.toBeInstanceOf(MercadoPagoReconnectRequiredError)

    const connection = state.profile.mercadoPagoConnection

    expect(connection?.status).toBe('action_required')
    expect(connection?.refreshFailureCount).toBe(1)
    expect(decryptSecret(connection?.encryptedAccessToken)).toBe('access-old')
    expect(connection?.lastError).toContain('400')
  })

  it('keeps the connection usable when Mercado Pago is merely down', async () => {
    const { payload, state } = createFakePayload(
      buildProfile({ accessTokenExpiresAt: daysFromNow(40) }),
    )

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(503, 'service unavailable'))

    await expect(
      refreshMercadoPagoConnection({ payload, profileID: 'profile-1' }),
    ).rejects.toThrow(/503/)

    const connection = state.profile.mercadoPagoConnection

    // The token we already hold is good for another 40 days, so a transient
    // outage must not lock the artist out of selling.
    expect(connection?.status).toBe('connected')
    expect(connection?.refreshFailureCount).toBe(1)
  })
})

describe('isDueForProactiveRefresh', () => {
  beforeEach(() => {
    process.env.MARKETPLACE_TOKEN_ENCRYPTION_KEY = 'a-long-enough-test-encryption-key'
  })

  it('is due once the token is older than a month', () => {
    expect(isDueForProactiveRefresh(buildProfile({ accessTokenExpiresAt: daysFromNow(149) }))).toBe(
      true,
    )
    expect(isDueForProactiveRefresh(buildProfile({ accessTokenExpiresAt: daysFromNow(151) }))).toBe(
      false,
    )
  })

  it('ignores accounts that were never connected', () => {
    expect(isDueForProactiveRefresh(buildProfile({ status: 'not_connected' }))).toBe(false)
    expect(isDueForProactiveRefresh(null)).toBe(false)
  })
})

describe('describeConnectionHealth', () => {
  beforeEach(() => {
    process.env.MARKETPLACE_TOKEN_ENCRYPTION_KEY = 'a-long-enough-test-encryption-key'
  })

  it('reports a healthy connection with days remaining', () => {
    const health = describeConnectionHealth(buildProfile({ accessTokenExpiresAt: daysFromNow(120) }))

    expect(health.state).toBe('connected')
    // Floors to 119 or 120 depending on the sub-millisecond gap between
    // building the fixture and reading the clock.
    expect(health.daysRemaining).toBeGreaterThanOrEqual(119)
    expect(health.daysRemaining).toBeLessThanOrEqual(120)
    expect(health.lifetimeRatio).toBeGreaterThan(0.6)
  })

  it('flags the last month and a token that already died', () => {
    expect(describeConnectionHealth(buildProfile({ accessTokenExpiresAt: daysFromNow(10) })).state).toBe(
      'expiring',
    )
    expect(describeConnectionHealth(buildProfile({ accessTokenExpiresAt: daysFromNow(-1) })).state).toBe(
      'expired',
    )
  })

  it('reports an account that needs the artist to step in', () => {
    expect(describeConnectionHealth(buildProfile({ status: 'action_required' })).state).toBe(
      'action_required',
    )
  })
})
