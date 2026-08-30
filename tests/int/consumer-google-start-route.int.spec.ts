import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildGoogleConsumerAuthorizationURLMock: vi.fn(),
  cookiesMock: vi.fn(),
  getServerSideURLMock: vi.fn(),
  isGoogleConsumerOAuthConfiguredMock: vi.fn(),
  normalizeURLMock: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mocks.cookiesMock,
}))

vi.mock('@/utilities/consumerAuth', () => ({
  buildGoogleConsumerAuthorizationURL: mocks.buildGoogleConsumerAuthorizationURLMock,
  CONSUMER_GOOGLE_STATE_COOKIE: 'consumer-google-oauth-state',
  isGoogleConsumerOAuthConfigured: mocks.isGoogleConsumerOAuthConfiguredMock,
}))

vi.mock('@/utilities/getURL', () => ({
  getServerSideURL: mocks.getServerSideURLMock,
  normalizeURL: mocks.normalizeURLMock,
}))

import { GET } from '@/app/(frontend)/consumer-api/auth/google/start/route'

describe('consumer google start route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.cookiesMock.mockResolvedValue({
      delete: vi.fn(),
      set: vi.fn(),
    })
    mocks.isGoogleConsumerOAuthConfiguredMock.mockReturnValue(true)
    mocks.getServerSideURLMock.mockReturnValue('https://oddsound.co')
    mocks.normalizeURLMock.mockImplementation((value: string) => value)
    mocks.buildGoogleConsumerAuthorizationURLMock.mockReturnValue('https://accounts.google.com/mock')
  })

  it('redirects preview requests to the canonical host before setting oauth state', async () => {
    const response = await GET(
      new Request(
        'https://oddsound-preview.vercel.app/consumer-api/auth/google/start?next=%2Ffan%2Faccount',
      ),
    )

    expect(response.headers.get('location')).toBe(
      'https://oddsound.co/consumer-api/auth/google/start?next=%2Ffan%2Faccount',
    )
    expect(mocks.cookiesMock).not.toHaveBeenCalled()
    expect(mocks.buildGoogleConsumerAuthorizationURLMock).not.toHaveBeenCalled()
  })

  it('starts oauth on the canonical host and stores the state cookie', async () => {
    const cookieStore = {
      delete: vi.fn(),
      set: vi.fn(),
    }

    mocks.cookiesMock.mockResolvedValue(cookieStore)

    const response = await GET(
      new Request('https://oddsound.co/consumer-api/auth/google/start?next=%2Ffan%2Faccount'),
    )

    expect(cookieStore.set).toHaveBeenCalledTimes(2)
    expect(mocks.buildGoogleConsumerAuthorizationURLMock).toHaveBeenCalledTimes(1)
    expect(response.headers.get('location')).toBe('https://accounts.google.com/mock')
  })
})
