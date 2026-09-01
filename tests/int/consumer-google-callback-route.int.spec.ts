// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getPayloadTokenCookieOptionsMock: vi.fn(),
  loginOrRegisterConsumerWithGoogleMock: vi.fn(),
  resolveRequestOriginMock: vi.fn(),
}))

vi.mock('@/utilities/consumerAuth', () => ({
  CONSUMER_GOOGLE_STATE_COOKIE: 'consumer-google-oauth-state',
  loginOrRegisterConsumerWithGoogle: mocks.loginOrRegisterConsumerWithGoogleMock,
}))

vi.mock('@/utilities/payloadAuthCookie', () => ({
  getPayloadTokenCookieOptions: mocks.getPayloadTokenCookieOptionsMock,
}))

vi.mock('@/utilities/getURL', () => ({
  resolveRequestOrigin: mocks.resolveRequestOriginMock,
}))

import { GET } from '@/app/(frontend)/consumer-api/auth/google/callback/route'

describe('consumer google callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveRequestOriginMock.mockImplementation((request: Request | string) =>
      typeof request === 'string' ? new URL(request).origin : new URL(request.url).origin,
    )
    mocks.getPayloadTokenCookieOptionsMock.mockResolvedValue({
      httpOnly: true,
      path: '/',
    })
  })

  it('redirects invalid state errors back to the same preview host', async () => {
    const response = await GET(
      new NextRequest(
        'https://oddsound-preview.vercel.app/consumer-api/auth/google/callback?code=test-code&state=other-state',
        {
          headers: {
            cookie: 'consumer-google-oauth-state=stored-state',
          },
        },
      ),
    )

    expect(response.headers.get('location')).toBe(
      'https://oddsound-preview.vercel.app/fan/login?auth=invalid-state',
    )
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0')
  })

  it('redirects successful logins back to the same preview host', async () => {
    mocks.loginOrRegisterConsumerWithGoogleMock.mockResolvedValue({
      token: 'payload-token',
      user: {
        id: 'fan-1',
      },
    })

    const response = await GET(
      new NextRequest(
        'https://oddsound-preview.vercel.app/consumer-api/auth/google/callback?code=test-code&state=stored-state',
        {
          headers: {
            cookie:
              'consumer-google-oauth-state=stored-state; consumer-post-login-redirect=%2Ffan%2Faccount',
          },
        },
      ),
    )

    expect(mocks.loginOrRegisterConsumerWithGoogleMock).toHaveBeenCalledWith({
      code: 'test-code',
      serverURL: 'https://oddsound-preview.vercel.app',
    })
    expect(response.headers.get('location')).toBe(
      'https://oddsound-preview.vercel.app/fan/account',
    )
    expect(response.headers.get('set-cookie')).toContain('payload-token=payload-token')
  })
})
