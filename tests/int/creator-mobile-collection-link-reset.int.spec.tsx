import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CreatorMobileCollectionLinkReset, {
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

  it('forces repeat navigation for mobile pages and media links', () => {
    expect(shouldForceCollectionNavigation('/dashboard/collections/pages', '/dashboard/collections/pages')).toBe(true)
    expect(shouldForceCollectionNavigation('/dashboard/collections/pages/123', '/dashboard/collections/pages')).toBe(true)
    expect(shouldForceCollectionNavigation('/dashboard/collections/media/123', '/dashboard/collections/media')).toBe(true)
    expect(
      shouldForceCollectionNavigation('/dashboard/collections/biographies/123', '/dashboard/collections/biographies'),
    ).toBe(false)
  })

  it('forces explicit navigation when an active pages link is clicked on mobile', () => {
    document.body.innerHTML = '<a href="/dashboard/collections/pages">Lanzamientos</a>'
    const navigate = vi.fn()

    const handled = handleCollectionLinkResetClick({
      currentPath: '/dashboard/collections/pages/abc123',
      isMobile: true,
      navigate,
      target: document.querySelector('a'),
    })

    expect(handled).toBe(true)
    expect(navigate).toHaveBeenCalledWith('http://localhost:3000/dashboard/collections/pages')
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
