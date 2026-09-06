import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ScheduledPublishesNavLink from '@/components/ScheduledPublishesNavLink'

const { mockUseAuth, mockUsePathname } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUsePathname: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  useAuth: mockUseAuth,
}))

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}))

describe('ScheduledPublishesNavLink', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders for admins', () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: 'admin',
      },
    })

    render(React.createElement(ScheduledPublishesNavLink))

    expect(screen.getByRole('link', { name: 'Publicaciones programadas' }).getAttribute('href')).toBe(
      '/dashboard#scheduled-publishes',
    )
  })

  it('does not render for creators', () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: 'creator',
        editorAccess: false,
        userType: 'creator',
      },
    })

    render(React.createElement(ScheduledPublishesNavLink))

    expect(screen.queryByRole('link', { name: 'Publicaciones programadas' })).toBeNull()
  })
})
