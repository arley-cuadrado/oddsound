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
        _verificationToken: 'native-artist-token',
        editorAccess: false,
        email: 'artist@example.com',
        id: 'user-artist-1',
        logger: {
          error: vi.fn(),
        },
        profile: 'profile-artist-1',
        userType: 'artist',
      }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      logger: {
        error: vi.fn(),
      },
      sendEmail: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValueOnce({}),
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
          legalAcceptedAt: expect.any(String),
          legalAcceptedVersion: '2026-05-14',
          name: 'Artist Name',
          password: 'secure-password',
          role: 'creator',
          userType: 'artist',
          username: 'artist-name',
        }),
        disableVerificationEmail: true,
        draft: false,
        overrideAccess: true,
        req: expect.objectContaining({
          headers: expect.any(Headers),
        }),
        showHiddenFields: true,
      }),
    )

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'profiles',
        data: {
          genre: 'Indie Rock',
          location: 'Colombia',
        },
        id: 'profile-artist-1',
        overrideAccess: true,
      }),
    )
    expect(payload.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('native-artist-token'),
      }),
    )
  })

  it('registers a band account with the band account type', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({
        _verificationToken: 'native-band-token',
        editorAccess: false,
        email: 'band@example.com',
        id: 'user-band-1',
        profile: 'profile-band-1',
        userType: 'band',
      }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      logger: {
        error: vi.fn(),
      },
      sendEmail: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValueOnce({}),
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
          email: 'band@example.com',
          legalAccepted: true,
          legalAcceptedAt: expect.any(String),
          legalAcceptedVersion: '2026-05-14',
          name: 'Band Name',
          password: 'secure-password',
          role: 'creator',
          userType: 'band',
          username: 'band-name',
        }),
        req: expect.objectContaining({
          headers: expect.any(Headers),
        }),
      }),
    )
  })

  it('passes through request headers so verification emails use the active host', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({
        _verificationToken: 'native-preview-token',
        editorAccess: false,
        email: 'preview@example.com',
        id: 'user-preview-1',
        profile: 'profile-preview-1',
        userType: 'artist',
      }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      logger: {
        error: vi.fn(),
      },
      sendEmail: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValueOnce({}),
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

    expect((payload.create.mock.calls[0]?.[0]?.req?.headers as Headers).get('x-forwarded-host')).toBe(
      'oddsound-preview.vercel.app',
    )
    expect(payload.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('https://oddsound-preview.vercel.app/creator/verify?'),
      }),
    )
  })

  it('reissues a verification email when the creator already exists unverified', async () => {
    const payload = {
      create: vi.fn(),
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            _verified: false,
            email: 'artist@example.com',
            id: 'user-artist-3',
            name: 'Artist Name',
            userType: 'artist',
          },
        ],
      }),
      sendEmail: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({
        _verified: false,
        email: 'artist@example.com',
        id: 'user-artist-3',
        name: 'Artist Name',
        userType: 'artist',
      }),
    }

    mockGetPayload.mockResolvedValue(payload)
    mockCreateLocalReq.mockResolvedValue({})

    await expect(
      registerCreatorAccount({
        acceptedLegal: true,
        accountType: 'artist',
        country: 'Colombia',
        email: 'artist@example.com',
        genre: 'Indie Rock',
        name: 'Artist Name',
        password: 'secure-password',
        req: {
          headers: new Headers({
            'x-forwarded-host': 'oddsound-preview.vercel.app',
            'x-forwarded-proto': 'https',
          }),
        },
      }),
    ).resolves.toEqual({
      email: 'artist@example.com',
      message: 'Te enviamos un nuevo enlace de verificación.',
      ok: true,
      status: 'verification_email_resent',
    })

    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: {
          _verificationToken: expect.any(String),
          _verified: false,
        },
        id: 'user-artist-3',
      }),
    )
    expect(payload.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('https://oddsound-preview.vercel.app/creator/verify?'),
        to: 'artist@example.com',
      }),
    )
  })

  it('keeps signup successful when the profile sync fails after the user was created', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({
        _verificationToken: 'native-profile-failure-token',
        editorAccess: false,
        email: 'artist@example.com',
        id: 'user-artist-2',
        profile: 'profile-artist-2',
        userType: 'artist',
      }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      logger: {
        error: vi.fn(),
      },
      sendEmail: vi.fn().mockResolvedValue({}),
      update: vi
        .fn()
        .mockRejectedValueOnce(new Error("Cannot read properties of null (reading 'label')")),
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
    expect(payload.sendEmail).toHaveBeenCalled()
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
