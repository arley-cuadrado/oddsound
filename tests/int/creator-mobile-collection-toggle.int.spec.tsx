import React from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CreatorMobileCollectionToggle from '@/components/CreatorMobileCollectionToggle'

const useAuthMock = vi.fn()

vi.mock('@payloadcms/ui', () => ({
  useAuth: () => useAuthMock(),
}))

describe('CreatorMobileCollectionToggle', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  it('turns an active creator collection link into a nav-group toggle on mobile', () => {
    useAuthMock.mockReturnValue({
      user: {
        role: 'creator',
      },
    })

    window.history.replaceState({}, '', '/dashboard/collections/pages')

    document.body.innerHTML = `
      <div class="nav-group">
        <button class="nav-group__toggle" type="button">Colecciones</button>
        <div class="nav-group__content">
          <a href="/dashboard/collections/pages">Lanzamientos</a>
        </div>
      </div>
    `

    const toggleButton = document.querySelector<HTMLButtonElement>('.nav-group__toggle')
    const activeLink = document.querySelector<HTMLAnchorElement>('a[href="/dashboard/collections/pages"]')
    const toggleSpy = vi.spyOn(toggleButton as HTMLButtonElement, 'click')

    render(React.createElement(CreatorMobileCollectionToggle))

    fireEvent.click(activeLink as HTMLAnchorElement)

    expect(toggleSpy).toHaveBeenCalledTimes(1)
  })

  it('does not intercept inactive collection links', () => {
    useAuthMock.mockReturnValue({
      user: {
        role: 'creator',
      },
    })

    window.history.replaceState({}, '', '/dashboard')

    document.body.innerHTML = `
      <div class="nav-group">
        <button class="nav-group__toggle" type="button">Colecciones</button>
        <div class="nav-group__content">
          <a href="/dashboard/collections/pages">Lanzamientos</a>
        </div>
      </div>
    `

    const toggleButton = document.querySelector<HTMLButtonElement>('.nav-group__toggle')
    const inactiveLink = document.querySelector<HTMLAnchorElement>('a[href="/dashboard/collections/pages"]')
    const toggleSpy = vi.spyOn(toggleButton as HTMLButtonElement, 'click')

    render(React.createElement(CreatorMobileCollectionToggle))

    fireEvent.click(inactiveLink as HTMLAnchorElement)

    expect(toggleSpy).not.toHaveBeenCalled()
  })
})
