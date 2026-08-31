import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@/app/(frontend)/creator/verify/confirm-verification-form', () => ({
  ConfirmVerificationForm: ({ email, token }: { email: string; token: string }) => (
    <div data-testid="confirm-verification-form">
      {email}:{token}
    </div>
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

  it('shows the safe confirmation step when the link is complete and the account is still pending', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      _verified: false,
      email: 'artist@example.com',
      id: 'user-artist-1',
    } as Awaited<ReturnType<typeof findUserByEmail>>)

    const view = await CreatorVerifyView({
      searchParams: Promise.resolve({
        email: 'artist@example.com',
        token: 'valid-token',
      }),
    })

    render(view)

    expect(findUserByEmail).toHaveBeenCalledWith('artist@example.com')
    expect(screen.getByText('Confirma tu correo')).toBeTruthy()
    expect(
      screen.getByText(
        'Estamos validando tu enlace de forma segura para evitar que scanners o previsualizadores consuman el token antes que tú.',
      ),
    ).toBeTruthy()
    expect(screen.getByTestId('confirm-verification-form').textContent).toBe(
      'artist@example.com:valid-token',
    )
  })

  it('shows an invalid-link message when the params are incomplete', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null)

    const view = await CreatorVerifyView({
      searchParams: Promise.resolve({
        email: 'artist@example.com',
      }),
    })

    render(view)

    expect(screen.getByText('No pudimos validar el enlace')).toBeTruthy()
    expect(screen.getByText('El enlace de verificación no es válido o está incompleto.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver al registro' }).getAttribute('href')).toBe(
      '/creator/register',
    )
  })

  it('shows success when the account is already verified', async () => {
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

    expect(findUserByEmail).toHaveBeenCalledWith('editor@example.com')
    expect(screen.getByText('Correo confirmado')).toBeTruthy()
    expect(
      screen.getByText('Tu correo ya había sido confirmado. Ya puedes iniciar sesión.'),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' }).getAttribute('href')).toBe(
      '/creator/login',
    )
  })
})
