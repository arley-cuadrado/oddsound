import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getPayloadTokenCookieOptionsMock: vi.fn(),
  loginOrRegisterConsumerWithGoogleMock: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mocks.cookiesMock,
}))

vi.mock('@/utilities/consumerAuth', () => ({
  CONSUMER_GOOGLE_STATE_COOKIE: 'consumer-google-oauth-state',
  loginOrRegisterConsumerWithGoogle: mocks.loginOrRegisterConsumerWithGoogleMock,
}))

vi.mock('@/utilities/payloadAuthCookie', () => ({
  getPayloadTokenCookieOptions: mocks.getPayloadTokenCookieOptionsMock,
}))

import { GET } from '@/app/(frontend)/consumer-api/auth/google/callback/route'

describe('consumer google callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPayloadTokenCookieOptionsMock.mockResolvedValue({
      httpOnly: true,
      path: '/',
    })
  })

  it('redirects invalid state errors back to the same preview host', async () => {
    const cookieStore = {
      delete: vi.fn(),
      get: vi.fn((name: string) => {
        if (name === 'consumer-google-oauth-state') return { value: 'stored-state' }
        return undefined
      }),
      set: vi.fn(),
    }

    mocks.cookiesMock.mockResolvedValue(cookieStore)

    const response = await GET(
      new Request(
        'https://oddsound-preview.vercel.app/consumer-api/auth/google/callback?code=test-code&state=other-state',
      ),
    )

    expect(response.headers.get('location')).toBe(
      'https://oddsound-preview.vercel.app/fan/login?auth=invalid-state',
    )
  })

  it('redirects successful logins back to the same preview host', async () => {
    const cookieStore = {
      delete: vi.fn(),
      get: vi.fn((name: string) => {
        if (name === 'consumer-google-oauth-state') return { value: 'stored-state' }
        if (name === 'consumer-post-login-redirect') return { value: '/fan/account' }
        return undefined
      }),
      set: vi.fn(),
    }

    mocks.cookiesMock.mockResolvedValue(cookieStore)
    mocks.loginOrRegisterConsumerWithGoogleMock.mockResolvedValue({
      token: 'payload-token',
      user: {
        id: 'fan-1',
      },
    })

    const response = await GET(
      new Request(
        'https://oddsound-preview.vercel.app/consumer-api/auth/google/callback?code=test-code&state=stored-state',
      ),
    )

    expect(mocks.loginOrRegisterConsumerWithGoogleMock).toHaveBeenCalledWith({
      code: 'test-code',
      serverURL: 'https://oddsound-preview.vercel.app',
    })
    expect(response.headers.get('location')).toBe(
      'https://oddsound-preview.vercel.app/fan/account',
    )
  })
})
