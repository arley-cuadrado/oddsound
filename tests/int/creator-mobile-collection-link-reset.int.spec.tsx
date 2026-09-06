import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CreatorMobileCollectionLinkReset, {
  ensureActiveCollectionNavItemLink,
  getActiveCollectionInfo,
  handleCollectionLinkResetClick,
  shouldForceCollectionNavigation,
} from '@/components/CreatorMobileCollectionLinkReset'

const useAuthMock = vi.fn()

vi.mock('@payloadcms/ui', () => ({
  useAuth: () => useAuthMock(),
}))

describe('CreatorMobileCollectionLinkReset', () => {
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

  it('forces repeat navigation for any active creator collection link on mobile', () => {
    expect(shouldForceCollectionNavigation('/dashboard/collections/pages', '/dashboard/collections/pages')).toBe(true)
    expect(shouldForceCollectionNavigation('/dashboard/collections/pages/123', '/dashboard/collections/pages')).toBe(true)
    expect(shouldForceCollectionNavigation('/dashboard/collections/media/123', '/dashboard/collections/media')).toBe(true)
    expect(
      shouldForceCollectionNavigation('/dashboard/collections/biographies/123', '/dashboard/collections/biographies'),
    ).toBe(true)
    expect(
      shouldForceCollectionNavigation('/dashboard/collections/profiles/123', '/dashboard/collections/profiles/123'),
    ).toBe(true)
    expect(
      shouldForceCollectionNavigation('/dashboard', '/dashboard/collections/biographies'),
    ).toBe(false)
  })

  it('forces explicit navigation when an active biography link is clicked on mobile', () => {
    document.body.innerHTML = '<a href="/dashboard/collections/biographies">Biografia</a>'
    const navigate = vi.fn()

    const handled = handleCollectionLinkResetClick({
      currentPath: '/dashboard/collections/biographies/abc123',
      isMobile: true,
      navigate,
      target: document.querySelector('a'),
    })

    expect(handled).toBe(true)
    expect(navigate).toHaveBeenCalledWith('http://localhost:3000/dashboard/collections/biographies')
  })

  it('maps the active creator collection path to its mobile nav item', () => {
    expect(getActiveCollectionInfo('/dashboard/collections/pages/123')).toEqual({
      href: '/dashboard/collections/pages',
      label: 'Lanzamientos',
      slug: 'pages',
    })

    expect(getActiveCollectionInfo('/dashboard/collections/posts')).toBeNull()
  })

  it('restores the active creator collection item as a clickable link in mobile nav', () => {
    document.body.innerHTML = `
      <div class="nav-group__content">
        <div class="nav-link">Lanzamientos</div>
        <a href="/dashboard/collections/biographies" class="nav-link">Biografía</a>
      </div>
    `

    const restored = ensureActiveCollectionNavItemLink(document, '/dashboard/collections/pages/abc123')

    expect(restored).toBe(true)

    const restoredLink = document.querySelector<HTMLAnchorElement>('a[href="/dashboard/collections/pages"]')
    expect(restoredLink?.textContent).toBe('Lanzamientos')
    expect(restoredLink?.className).toBe('nav-link')
  })

  it('does not attach handlers for non-creators', () => {
    useAuthMock.mockReturnValue({
      user: {
        role: 'admin',
      },
    })

    expect(render(React.createElement(CreatorMobileCollectionLinkReset)).container).toBeTruthy()
  })
})
