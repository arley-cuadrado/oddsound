import React from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CreatorCollectionFilter from '@/components/CreatorCollectionFilter'

const useAuthMock = vi.fn()

vi.mock('@payloadcms/ui', () => ({
  useAuth: () => useAuthMock(),
}))

describe('CreatorCollectionFilter', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
    document.body.innerHTML = `
      <nav>
        <ul>
          <li data-link="pages"><a href="/dashboard/collections/pages">Lanzamientos</a></li>
          <li data-link="biographies"><a href="/dashboard/collections/biographies">Biografia</a></li>
          <li data-link="media"><a href="/dashboard/collections/media">Imagenes</a></li>
          <li data-link="profiles"><a href="/dashboard/collections/profiles">Perfiles</a></li>
          <li data-link="comments"><a href="/dashboard/collections/comments">Comentarios</a></li>
        </ul>
      </nav>
    `
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  it('hides only disallowed creator collections without leaving inline display styles', async () => {
    useAuthMock.mockReturnValue({
      user: {
        editorAccess: false,
        role: 'creator',
        userType: 'creator',
      },
    })

    render(React.createElement(CreatorCollectionFilter))

    await waitFor(() => {
      expect(document.querySelector('[data-link="pages"]')).toHaveProperty('hidden', false)
    })

    expect(document.querySelector('[data-link="pages"]')).toHaveProperty('hidden', false)
    expect(document.querySelector('[data-link="biographies"]')).toHaveProperty('hidden', false)
    expect(document.querySelector('[data-link="media"]')).toHaveProperty('hidden', false)
    expect(document.querySelector('[data-link="profiles"]')).toHaveProperty('hidden', false)
    expect(document.querySelector('[data-link="comments"]')).toHaveProperty('hidden', true)

    expect((document.querySelector('[data-link="pages"]') as HTMLElement).style.display).toBe('')
    expect((document.querySelector('[data-link="comments"]') as HTMLElement).style.display).toBe('')
  })
})
