import React from 'react'
import { render, screen } from '@testing-library/react'
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

describe('CreatorVerifyView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('confirms the token and sends the creator to login', async () => {
    const verifyEmail = vi.fn().mockResolvedValue(true)

    mockGetPayload.mockResolvedValue({
      verifyEmail,
    })

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

    const view = await CreatorVerifyView({
      searchParams: Promise.resolve({
        email: 'artist@example.com',
        token: 'invalid-token',
      }),
    })

    render(view)

    expect(screen.getByText('No pudimos validar el enlace')).toBeTruthy()
    expect(screen.getByText('Verification token is invalid.')).toBeTruthy()
    expect(screen.getByTestId('verification-resend-form').textContent).toContain(
      'artist@example.com',
    )
  })
})
