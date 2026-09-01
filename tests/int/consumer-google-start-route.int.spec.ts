// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildGoogleConsumerAuthorizationURLMock: vi.fn(),
  getServerSideURLMock: vi.fn(),
  isGoogleConsumerOAuthConfiguredMock: vi.fn(),
  normalizeURLMock: vi.fn((value: string) => value),
  resolveRequestOriginMock: vi.fn(),
}))

vi.mock('@/utilities/consumerAuth', () => ({
  buildGoogleConsumerAuthorizationURL: mocks.buildGoogleConsumerAuthorizationURLMock,
  CONSUMER_GOOGLE_STATE_COOKIE: 'consumer-google-oauth-state',
  isGoogleConsumerOAuthConfigured: mocks.isGoogleConsumerOAuthConfiguredMock,
}))

vi.mock('@/utilities/getURL', () => ({
  getServerSideURL: mocks.getServerSideURLMock,
  normalizeURL: mocks.normalizeURLMock,
  resolveRequestOrigin: mocks.resolveRequestOriginMock,
}))

import { GET } from '@/app/(frontend)/consumer-api/auth/google/start/route'

describe('consumer google start route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.isGoogleConsumerOAuthConfiguredMock.mockReturnValue(true)
    mocks.getServerSideURLMock.mockReturnValue('https://oddsound.co')
    mocks.resolveRequestOriginMock.mockImplementation((request: Request | string) =>
      typeof request === 'string' ? new URL(request).origin : new URL(request.url).origin,
    )
    mocks.buildGoogleConsumerAuthorizationURLMock.mockReturnValue('https://accounts.google.com/mock')
  })

  it('starts oauth on the current preview host and stores the state cookie there', async () => {
    const response = await GET(
      new Request(
        'https://oddsound-preview.vercel.app/consumer-api/auth/google/start?next=%2Ffan%2Faccount',
      ),
    )

    expect(mocks.buildGoogleConsumerAuthorizationURLMock).toHaveBeenCalledWith(
      expect.any(String),
      'https://oddsound-preview.vercel.app',
    )
    expect(response.headers.get('location')).toBe('https://accounts.google.com/mock')
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0')
    expect(response.headers.get('set-cookie')).toContain('consumer-google-oauth-state=')
  })

  it('redirects missing Google config back to the current host', async () => {
    mocks.isGoogleConsumerOAuthConfiguredMock.mockReturnValue(false)

    const response = await GET(
      new Request('https://oddsound-preview.vercel.app/consumer-api/auth/google/start'),
    )

    expect(response.headers.get('location')).toBe(
      'https://oddsound-preview.vercel.app/fan/login?auth=missing-config',
    )
  })
})
