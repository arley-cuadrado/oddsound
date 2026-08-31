import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetPayload } = vi.hoisted(() => ({
  mockGetPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({
  default: {},
}))

vi.mock('payload', () => ({
  getPayload: mockGetPayload,
}))

vi.mock('@/utilities/creatorAuth', () => ({
  findUserByEmail: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/app/(frontend)/creator/verification-resend-form', () => ({
  VerificationResendForm: ({ email }: { email: string }) => (
    <div data-testid="verification-resend-form">{email}</div>
  ),
}))

import CreatorVerifyView from '@/app/(frontend)/creator/verify/view'
import { findUserByEmail } from '@/utilities/creatorAuth'

describe('CreatorVerifyView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('confirms the token and sends the creator to login', async () => {
    const verifyEmail = vi.fn().mockResolvedValue(true)

    mockGetPayload.mockResolvedValue({
      verifyEmail,
    })
    vi.mocked(findUserByEmail).mockResolvedValue(null)

    const view = await CreatorVerifyView({
      searchParams: Promise.resolve({
        email: 'artist@example.com',
        token: 'valid-token',
      }),
    })

    render(view)

    expect(verifyEmail).toHaveBeenCalledWith({
      collection: 'users',
      token: 'valid-token',
    })
    expect(screen.getByText('Correo confirmado')).toBeTruthy()
    expect(
      screen.getByText('Tu correo fue confirmado correctamente. Ya puedes iniciar sesión.'),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' }).getAttribute('href')).toBe(
      '/creator/login',
    )
  })

  it('shows the resend form when the token is invalid', async () => {
    const verifyEmail = vi.fn().mockRejectedValue(new Error('Verification token is invalid.'))

    mockGetPayload.mockResolvedValue({
      verifyEmail,
    })
    vi.mocked(findUserByEmail).mockResolvedValue(null)

    const view = await CreatorVerifyView({
      searchParams: Promise.resolve({
        email: 'artist@example.com',
        token: 'invalid-token',
      }),
    })

    render(view)

    expect(screen.getByText('No pudimos validar el enlace')).toBeTruthy()
    expect(screen.getByText('Verification token is invalid.')).toBeTruthy()
    expect(findUserByEmail).toHaveBeenCalledWith('artist@example.com', expect.anything())
    expect(screen.getByTestId('verification-resend-form').textContent).toContain(
      'artist@example.com',
    )
  })

  it('shows success when the token was already consumed but the email is verified', async () => {
    const verifyEmail = vi.fn().mockRejectedValue(new Error('Verification token is invalid.'))

    mockGetPayload.mockResolvedValue({
      verifyEmail,
    })
    vi.mocked(findUserByEmail).mockResolvedValue({
      _verified: true,
      email: 'editor@example.com',
      id: 'user-editor-1',
    } as Awaited<ReturnType<typeof findUserByEmail>>)

    const view = await CreatorVerifyView({
      searchParams: Promise.resolve({
        email: 'editor@example.com',
        token: 'consumed-token',
      }),
    })

    render(view)

    expect(verifyEmail).toHaveBeenCalledWith({
      collection: 'users',
      token: 'consumed-token',
    })
    expect(findUserByEmail).toHaveBeenCalledWith('editor@example.com', expect.anything())
    expect(screen.getByText('Correo confirmado')).toBeTruthy()
    expect(
      screen.getByText('Tu correo ya había sido confirmado. Ya puedes iniciar sesión.'),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' }).getAttribute('href')).toBe(
      '/creator/login',
    )
  })

  it('skips verifyEmail when the account is already verified before opening the link again', async () => {
    const verifyEmail = vi.fn()

    mockGetPayload.mockResolvedValue({
      verifyEmail,
    })
    vi.mocked(findUserByEmail).mockResolvedValue({
      _verified: true,
      email: 'artist@example.com',
      id: 'user-artist-1',
    } as Awaited<ReturnType<typeof findUserByEmail>>)

    const view = await CreatorVerifyView({
      searchParams: Promise.resolve({
        email: ' Artist@Example.com ',
        token: 'already-used-token',
      }),
    })

    render(view)

    expect(findUserByEmail).toHaveBeenCalledWith('artist@example.com', expect.anything())
    expect(verifyEmail).not.toHaveBeenCalled()
    expect(screen.getByText('Correo confirmado')).toBeTruthy()
    expect(
      screen.getByText('Tu correo ya había sido confirmado. Ya puedes iniciar sesión.'),
    ).toBeTruthy()
  })
})
