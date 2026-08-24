import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateLocalReq, mockEnsureConsumerProfile, mockGetPayload } = vi.hoisted(() => ({
  mockCreateLocalReq: vi.fn(),
  mockEnsureConsumerProfile: vi.fn(),
  mockGetPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({
  default: {},
}))

vi.mock('payload', () => ({
  createLocalReq: mockCreateLocalReq,
  getPayload: mockGetPayload,
}))

vi.mock('@/utilities/consumerProfiles', () => ({
  ensureConsumerProfile: mockEnsureConsumerProfile,
}))

import {
  CROSS_ACCOUNT_EMAIL_CONFLICT_MESSAGE,
  registerCreatorAccount,
} from '@/utilities/creatorAuth'
import { loginOrRegisterConsumerWithGoogle } from '@/utilities/consumerAuth'

describe('auth email segmentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-google-client-id'
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-google-client-secret'
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'http://localhost:3000/consumer-api/auth/google/callback'
  })

  it('blocks creator registration when the email already belongs to a fan account', async () => {
    mockGetPayload.mockResolvedValue({
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            authProvider: 'google',
            email: 'consumer@oddsound.com',
            id: 'user-consumer-1',
            userType: 'fan',
            _verified: true,
          },
        ],
      }),
    })

    await expect(
      registerCreatorAccount({
        acceptedLegal: true,
        accountType: 'artist',
        country: 'Colombia',
        email: 'consumer@oddsound.com',
        genre: 'Indie',
        name: 'Proyecto Nuevo',
        password: 'secure-password',
      }),
    ).resolves.toEqual({
      message: CROSS_ACCOUNT_EMAIL_CONFLICT_MESSAGE,
      ok: false,
    })
  })

  it('blocks fan Google signup when the email already belongs to an artist or band account', async () => {
    const payload = {
      find: vi
        .fn()
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({
          docs: [
            {
              authProvider: null,
              email: 'artist@oddsound.com',
              id: 'user-creator-1',
              userType: 'creator',
              _verified: true,
            },
          ],
        }),
    }

    mockGetPayload.mockResolvedValue(payload)
    mockCreateLocalReq.mockResolvedValue({})

    const tokenResponse = {
      access_token: 'google-token',
    }
    const userInfoResponse = {
      email: 'artist@oddsound.com',
      name: 'Artist Existing',
      sub: 'google-subject-1',
    }

    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        json: async () => tokenResponse,
        ok: true,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => userInfoResponse,
        ok: true,
      } as Response)

    await expect(
      loginOrRegisterConsumerWithGoogle({
        code: 'oauth-code',
      }),
    ).rejects.toThrow(CROSS_ACCOUNT_EMAIL_CONFLICT_MESSAGE)

    fetchMock.mockRestore()
  })
})
