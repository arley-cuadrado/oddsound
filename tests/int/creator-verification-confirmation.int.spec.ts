// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetPayload } = vi.hoisted(() => ({
  mockGetPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({
  default: {},
}))

vi.mock('payload', () => ({
  getPayload: mockGetPayload,
}))

import { confirmCreatorVerification } from '@/utilities/creatorAuth'

describe('creator verification confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects incomplete verification links', async () => {
    await expect(confirmCreatorVerification({ email: '', token: '' })).resolves.toEqual({
      message: 'El enlace de verificación no es válido o está incompleto.',
      ok: false,
      status: 'verification_token_invalid',
    })
  })

  it('returns success when the account is already verified', async () => {
    mockGetPayload.mockResolvedValue({
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            _verified: true,
            email: 'artist@example.com',
            id: 'user-1',
          },
        ],
      }),
      verifyEmail: vi.fn(),
    })

    await expect(
      confirmCreatorVerification({
        email: 'artist@example.com',
        token: 'unused-token',
      }),
    ).resolves.toEqual({
      email: 'artist@example.com',
      message: 'Tu correo ya había sido confirmado. Ya puedes iniciar sesión.',
      ok: true,
      status: 'verification_already_completed',
    })
  })

  it('confirms a token that belongs to the same email', async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce({
        docs: [
          {
            _verified: false,
            email: 'artist@example.com',
            id: 'user-1',
          },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            _verificationToken: 'valid-token',
            _verified: false,
            email: 'artist@example.com',
            id: 'user-1',
          },
        ],
      })

    const verifyEmail = vi.fn().mockResolvedValue(true)

    mockGetPayload.mockResolvedValue({
      find,
      update: vi.fn().mockResolvedValue({}),
      verifyEmail,
    })

    await expect(
      confirmCreatorVerification({
        email: 'artist@example.com',
        token: 'valid-token',
      }),
    ).resolves.toEqual({
      email: 'artist@example.com',
      message: 'Tu correo fue confirmado correctamente. Ya puedes iniciar sesión.',
      ok: true,
      status: 'verification_completed',
    })

    expect(verifyEmail).toHaveBeenCalledWith({
      collection: 'users',
      token: 'valid-token',
    })
  })

  it('rejects tokens that do not belong to the supplied email', async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce({
        docs: [
          {
            _verified: false,
            email: 'artist@example.com',
            id: 'user-1',
          },
        ],
      })
      .mockResolvedValueOnce({
        docs: [],
      })

    const verifyEmail = vi.fn()

    mockGetPayload.mockResolvedValue({
      find,
      verifyEmail,
    })

    await expect(
      confirmCreatorVerification({
        email: 'artist@example.com',
        token: 'wrong-token',
      }),
    ).resolves.toEqual({
      email: 'artist@example.com',
      message: 'El enlace ya no es válido. Solicita uno nuevo para continuar.',
      ok: false,
      status: 'verification_token_invalid',
    })

    expect(verifyEmail).not.toHaveBeenCalled()
  })

  it('reports an expired verification link without consuming its token', async () => {
    const verifyEmail = vi.fn()
    vi.useFakeTimers()

    mockGetPayload.mockResolvedValue({
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            _verified: false,
            email: 'artist@example.com',
            id: 'user-1',
            verificationExpiresAt: '2026-08-30T12:00:00.000Z',
          },
        ],
      }),
      verifyEmail,
    })

    vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'))

    await expect(
      confirmCreatorVerification({
        email: 'artist@example.com',
        token: 'expired-token',
      }),
    ).resolves.toEqual({
      email: 'artist@example.com',
      message: 'El enlace de verificación expiró. Solicita uno nuevo para continuar.',
      ok: false,
      status: 'verification_token_expired',
    })

    expect(verifyEmail).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('treats token errors as success if the account ended up verified', async () => {
    const firstPayload = {
      find: vi
        .fn()
        .mockResolvedValueOnce({
          docs: [
            {
              _verified: false,
              email: 'artist@example.com',
              id: 'user-1',
            },
          ],
        })
        .mockResolvedValueOnce({
          docs: [
            {
              _verificationToken: 'valid-token',
              _verified: false,
              email: 'artist@example.com',
              id: 'user-1',
            },
          ],
        }),
      verifyEmail: vi.fn().mockRejectedValue(new Error('Verification token is invalid.')),
    }

    const secondPayload = {
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            _verified: true,
            email: 'artist@example.com',
            id: 'user-1',
          },
        ],
      }),
    }

    mockGetPayload.mockResolvedValueOnce(firstPayload).mockResolvedValueOnce(secondPayload)

    await expect(
      confirmCreatorVerification({
        email: 'artist@example.com',
        token: 'valid-token',
      }),
    ).resolves.toEqual({
      email: 'artist@example.com',
      message: 'Tu correo ya había sido confirmado. Ya puedes iniciar sesión.',
      ok: true,
      status: 'verification_already_completed',
    })
  })
})
