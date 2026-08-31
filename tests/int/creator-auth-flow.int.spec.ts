import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateLocalReq, mockEnsureCreatorProfile, mockGetPayload } = vi.hoisted(() => ({
  mockCreateLocalReq: vi.fn(),
  mockEnsureCreatorProfile: vi.fn(),
  mockGetPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({
  default: {},
}))

vi.mock('payload', () => ({
  createLocalReq: mockCreateLocalReq,
  getPayload: mockGetPayload,
}))

vi.mock('@/utilities/creatorProfiles', () => ({
  ensureCreatorProfile: mockEnsureCreatorProfile,
}))

import {
  CREATOR_VERIFICATION_ERROR_MESSAGE,
  loginCreatorAccount,
  registerCreatorAccount,
} from '@/utilities/creatorAuth'

describe('creator auth flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateLocalReq.mockResolvedValue({})
  })

  it('registers an artist account and stores profile country and genre', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({
        email: 'artist@example.com',
        id: 'user-artist-1',
        logger: {
          error: vi.fn(),
        },
        profile: 'profile-artist-1',
      }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      logger: {
        error: vi.fn(),
      },
      sendEmail: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue({}),
    }

    mockGetPayload.mockResolvedValue(payload)

    await expect(
      registerCreatorAccount({
        acceptedLegal: true,
        accountType: 'artist',
        country: 'Colombia',
        email: 'Artist@Example.com',
        genre: 'Indie Rock',
        name: 'Artist Name',
        password: 'secure-password',
      }),
    ).resolves.toEqual({
      email: 'artist@example.com',
      message: 'Tu cuenta fue creada. Revisa tu correo para activarla.',
      ok: true,
      status: 'pending_verification',
    })

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: expect.objectContaining({
          accountType: 'artist',
          email: 'artist@example.com',
          legalAccepted: true,
          name: 'Artist Name',
          password: 'secure-password',
          role: 'creator',
          username: 'artist-name',
        }),
        disableVerificationEmail: true,
        depth: 0,
        draft: false,
        overrideAccess: true,
        showHiddenFields: true,
      }),
    )

    expect(payload.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'profiles',
        data: {
          genre: 'Indie Rock',
          location: 'Colombia',
        },
        depth: 0,
        id: 'profile-artist-1',
      }),
    )

    expect(payload.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'users',
        data: expect.objectContaining({
          _verificationToken: expect.any(String),
          _verified: false,
        }),
        id: 'user-artist-1',
      }),
    )

    expect(payload.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Confirma tu correo en oddsound',
        to: 'artist@example.com',
      }),
    )
  })

  it('registers a band account with the band account type', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({
        email: 'band@example.com',
        id: 'user-band-1',
        profile: 'profile-band-1',
      }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      logger: {
        error: vi.fn(),
      },
      sendEmail: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue({}),
    }

    mockGetPayload.mockResolvedValue(payload)

    await registerCreatorAccount({
      acceptedLegal: true,
      accountType: 'band',
      country: 'Mexico',
      email: 'band@example.com',
      genre: 'Alt Pop',
      name: 'Band Name',
      password: 'secure-password',
    })

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountType: 'band',
          username: 'band-name',
        }),
        depth: 0,
      }),
    )
  })

  it('passes through request headers so verification emails use the active host', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({
        email: 'preview@example.com',
        id: 'user-preview-1',
        profile: 'profile-preview-1',
      }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      logger: {
        error: vi.fn(),
      },
      sendEmail: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue({}),
    }

    const payloadReq = {}
    mockGetPayload.mockResolvedValue(payload)
    mockCreateLocalReq.mockResolvedValue(payloadReq)

    await registerCreatorAccount({
      acceptedLegal: true,
      accountType: 'artist',
      country: 'Colombia',
      email: 'preview@example.com',
      genre: 'Indie Rock',
      name: 'Preview Artist',
      password: 'secure-password',
      req: {
        headers: new Headers({
          'x-forwarded-host': 'oddsound-preview.vercel.app',
          'x-forwarded-proto': 'https',
        }),
      },
    })

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        req: expect.objectContaining({
          headers: expect.any(Headers),
        }),
      }),
    )

    expect(
      (payload.create.mock.calls[0]?.[0]?.req?.headers as Headers).get('x-forwarded-host'),
    ).toBe('oddsound-preview.vercel.app')
  })

  it('keeps signup successful when the profile sync fails after the user was created', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({
        email: 'artist@example.com',
        id: 'user-artist-2',
        profile: 'profile-artist-2',
      }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      logger: {
        error: vi.fn(),
      },
      sendEmail: vi.fn().mockResolvedValue(undefined),
      update: vi
        .fn()
        .mockRejectedValueOnce(new Error("Cannot read properties of null (reading 'label')"))
        .mockResolvedValueOnce({}),
    }

    mockGetPayload.mockResolvedValue(payload)

    await expect(
      registerCreatorAccount({
        acceptedLegal: true,
        accountType: 'artist',
        country: 'Colombia',
        email: 'artist@example.com',
        genre: 'Indie Rock',
        name: 'Artist Name',
        password: 'secure-password',
      }),
    ).resolves.toEqual({
      email: 'artist@example.com',
      message: 'Tu cuenta fue creada. Revisa tu correo para activarla.',
      ok: true,
      status: 'pending_verification',
    })

    expect(payload.logger.error).toHaveBeenCalled()
  })

  it('keeps login blocked until the creator confirms the email', async () => {
    const unverifiedError = new Error('Unverified')
    unverifiedError.name = 'UnverifiedEmail'

    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            email: 'artist@example.com',
            id: 'user-artist-1',
            _verified: false,
          },
        ],
      }),
      login: vi.fn().mockRejectedValue(unverifiedError),
    }

    mockGetPayload.mockResolvedValue(payload)
    mockCreateLocalReq.mockResolvedValue({})

    await expect(
      loginCreatorAccount({
        email: 'artist@example.com',
        password: 'secure-password',
      }),
    ).resolves.toEqual({
      email: 'artist@example.com',
      message: CREATOR_VERIFICATION_ERROR_MESSAGE,
      ok: false,
      status: 'pending_verification',
    })

    expect(mockEnsureCreatorProfile).not.toHaveBeenCalled()
  })

  it('allows login after the creator has already verified the email', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            email: 'band@example.com',
            id: 'user-band-1',
            _verified: true,
          },
        ],
      }),
      login: vi.fn().mockResolvedValue({
        token: 'payload-token',
        user: {
          accountType: 'band',
          email: 'band@example.com',
          id: 'user-band-1',
          name: 'Band Name',
          profile: 'profile-band-1',
          role: 'creator',
        },
      }),
    }

    mockGetPayload.mockResolvedValue(payload)
    mockCreateLocalReq.mockResolvedValue({ requestID: 'req-1' })
    mockEnsureCreatorProfile.mockResolvedValue('profile-band-1')

    await expect(
      loginCreatorAccount({
        email: 'band@example.com',
        password: 'secure-password',
      }),
    ).resolves.toEqual({
      ok: true,
      status: 'logged_in',
      token: 'payload-token',
      user: {
        accountType: 'band',
        email: 'band@example.com',
        id: 'user-band-1',
        name: 'Band Name',
        profile: 'profile-band-1',
        role: 'creator',
      },
    })

    expect(mockEnsureCreatorProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          accountType: 'band',
          email: 'band@example.com',
          id: 'user-band-1',
          profile: 'profile-band-1',
          role: 'creator',
        }),
      }),
    )
  })
})
