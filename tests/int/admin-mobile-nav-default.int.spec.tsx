import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AdminMobileNavDefault from '@/components/AdminMobileNavDefault'

const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
}))

describe('AdminMobileNavDefault', () => {
  const originalMatchMedia = window.matchMedia
  let navShell: HTMLDivElement

  beforeEach(() => {
    document.body.className = ''
    navShell = document.createElement('div')
    const templateDefault = document.createElement('div')
    templateDefault.className = 'template-default'
    const appHeader = document.createElement('div')
    appHeader.className = 'app-header'
    const mobileToggler = document.createElement('button')
    mobileToggler.className = 'app-header__mobile-nav-toggler nav-toggler--is-open'
    appHeader.appendChild(mobileToggler)
    const aside = document.createElement('aside')
    aside.className = 'nav'
    const link = document.createElement('a')
    link.className = 'nav__link'
    link.href = '/dashboard/collections/pages'
    link.textContent = 'Lanzamientos'
    navShell.appendChild(appHeader)
    aside.appendChild(link)
    navShell.appendChild(templateDefault)
    navShell.appendChild(aside)
    document.body.appendChild(navShell)
    mockUsePathname.mockReturnValue('/dashboard')
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    document.body.className = ''
    document.body.replaceChildren()
  })

  it('does not change desktop dashboard navigation', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
    }) as typeof window.matchMedia

    render(React.createElement(AdminMobileNavDefault))

    expect(document.body.classList.contains('mobile-dashboard-route')).toBe(false)
    expect(document.body.classList.contains('mobile-dashboard-nav-default')).toBe(false)
    expect(document.querySelector('.mobile-dashboard-nav-menu')).toBeNull()
  })

  it('renders the mobile dashboard overlay only on the mobile dashboard home after hydration', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    }) as typeof window.matchMedia

    render(React.createElement(AdminMobileNavDefault))
    expect(document.body.classList.contains('mobile-dashboard-route')).toBe(true)
    expect(document.body.classList.contains('mobile-dashboard-nav-default')).toBe(true)
    expect(document.querySelector('.mobile-dashboard-nav-menu__link')?.textContent).toBe('Lanzamientos')
  })

  it('shows a trigger on dashboard modules and opens the custom overlay when tapped', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    }) as typeof window.matchMedia

    mockUsePathname.mockReturnValue('/dashboard/collections/users')
    render(React.createElement(AdminMobileNavDefault))

    expect(document.body.classList.contains('mobile-dashboard-route')).toBe(true)
    expect(document.body.classList.contains('mobile-dashboard-nav-default')).toBe(false)
    expect(document.querySelector('.mobile-dashboard-nav-menu')).toBeNull()

    const trigger = document.querySelector<HTMLButtonElement>('.mobile-dashboard-nav-trigger')
    expect(trigger).not.toBeNull()
    fireEvent.click(trigger!)
    expect(document.querySelector('.mobile-dashboard-nav-menu')).not.toBeNull()
  })

  it('clears the native payload mobile nav state on dashboard routes', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    }) as typeof window.matchMedia

    document.querySelector('.template-default')?.classList.add('template-default--nav-open')
    document.querySelector('.app-header')?.classList.add('app-header--nav-open')

    mockUsePathname.mockReturnValue('/dashboard/collections/users')
    render(React.createElement(AdminMobileNavDefault))

    expect(document.querySelector('.template-default')?.classList.contains('template-default--nav-open')).toBe(false)
    expect(document.querySelector('.app-header')?.classList.contains('app-header--nav-open')).toBe(false)
    expect(document.querySelector('.nav-toggler--is-open')).toBeNull()
  })

  it('does not force the mobile dashboard class outside dashboard routes', () => {
    mockUsePathname.mockReturnValue('/creator/login')

    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    }) as typeof window.matchMedia

    render(React.createElement(AdminMobileNavDefault))

    expect(document.body.classList.contains('mobile-dashboard-route')).toBe(false)
    expect(document.body.classList.contains('mobile-dashboard-nav-default')).toBe(false)
    expect(document.querySelector('.mobile-dashboard-nav-trigger')).toBeNull()
  })
})
