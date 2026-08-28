import React from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AdminMobileNavDefault from '@/components/AdminMobileNavDefault'

const { mockUseNav, mockUsePathname } = vi.hoisted(() => ({
  mockUseNav: vi.fn(),
  mockUsePathname: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  useNav: mockUseNav,
}))

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
}))

describe('AdminMobileNavDefault', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    document.body.className = ''
    mockUsePathname.mockReturnValue('/dashboard')
    mockUseNav.mockReturnValue({
      hydrated: true,
      navOpen: false,
      setNavOpen: vi.fn(),
    })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    document.body.className = ''
  })

  it('does not change desktop dashboard navigation', () => {
    const setNavOpen = vi.fn()

    mockUseNav.mockReturnValue({
      hydrated: true,
      navOpen: false,
      setNavOpen,
    })

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
    }) as typeof window.matchMedia

    render(React.createElement(AdminMobileNavDefault))

    expect(setNavOpen).not.toHaveBeenCalled()
    expect(document.body.classList.contains('mobile-dashboard-route')).toBe(false)
    expect(document.body.classList.contains('mobile-dashboard-nav-default')).toBe(false)
  })

  it('opens the mobile nav by default only on the mobile dashboard home after hydration', () => {
    const setNavOpen = vi.fn()

    mockUseNav.mockReturnValue({
      hydrated: false,
      navOpen: false,
      setNavOpen,
    })

    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    }) as typeof window.matchMedia

    const { rerender } = render(React.createElement(AdminMobileNavDefault))

    expect(setNavOpen).not.toHaveBeenCalled()
    expect(document.body.classList.contains('mobile-dashboard-route')).toBe(true)
    expect(document.body.classList.contains('mobile-dashboard-nav-default')).toBe(true)

    mockUseNav.mockReturnValue({
      hydrated: true,
      navOpen: false,
      setNavOpen,
    })
    rerender(React.createElement(AdminMobileNavDefault))

    expect(setNavOpen).toHaveBeenCalledWith(true)
  })

  it('closes the mobile nav after navigating from dashboard home into a dashboard module', () => {
    const setNavOpen = vi.fn()

    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    }) as typeof window.matchMedia

    const { rerender } = render(React.createElement(AdminMobileNavDefault))

    expect(document.body.classList.contains('mobile-dashboard-route')).toBe(true)
    expect(document.body.classList.contains('mobile-dashboard-nav-default')).toBe(true)

    mockUsePathname.mockReturnValue('/dashboard/collections/users')
    mockUseNav.mockReturnValue({
      hydrated: true,
      navOpen: true,
      setNavOpen,
    })
    rerender(React.createElement(AdminMobileNavDefault))

    expect(setNavOpen).toHaveBeenCalledWith(false)
    expect(document.body.classList.contains('mobile-dashboard-route')).toBe(true)
    expect(document.body.classList.contains('mobile-dashboard-nav-default')).toBe(false)
  })

  it('does not force the mobile dashboard class outside dashboard routes', () => {
    const setNavOpen = vi.fn()

    mockUsePathname.mockReturnValue('/creator/login')
    mockUseNav.mockReturnValue({
      hydrated: true,
      navOpen: false,
      setNavOpen,
    })

    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    }) as typeof window.matchMedia

    render(React.createElement(AdminMobileNavDefault))

    expect(setNavOpen).not.toHaveBeenCalled()
    expect(document.body.classList.contains('mobile-dashboard-route')).toBe(false)
    expect(document.body.classList.contains('mobile-dashboard-nav-default')).toBe(false)
  })
})
