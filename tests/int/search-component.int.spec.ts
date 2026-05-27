import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Search } from '@/search/Component'

const replaceMock = vi.fn()
const usePathnameMock = vi.fn()
const useRouterMock = vi.fn()
const useSearchParamsMock = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => useRouterMock(),
  useSearchParams: () => useSearchParamsMock(),
}))

function createSearchParams(query = '') {
  const params = new URLSearchParams(query)

  return {
    get: (key: string) => params.get(key),
    toString: () => params.toString(),
  }
}

describe('Search', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    replaceMock.mockReset()
    usePathnameMock.mockReturnValue('/search')
    useRouterMock.mockReturnValue({ replace: replaceMock })
    useSearchParamsMock.mockReturnValue(createSearchParams())
  })

  it('does not search while the user is typing', () => {
    render(React.createElement(Search))

    fireEvent.change(screen.getByPlaceholderText('Comienza a descubrir ;)'), {
      target: { value: 'indie rock' },
    })

    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('searches when the user submits the form', () => {
    render(React.createElement(Search))

    fireEvent.change(screen.getByPlaceholderText('Comienza a descubrir ;)'), {
      target: { value: 'indie rock' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(replaceMock).toHaveBeenCalledWith('/search?q=indie+rock', { scroll: false })
  })

  it('removes the query parameter when the submitted value is empty', () => {
    useSearchParamsMock.mockReturnValue(createSearchParams('q=indie+rock'))

    render(React.createElement(Search))

    const input = screen.getByPlaceholderText('Comienza a descubrir ;)')

    fireEvent.change(input, {
      target: { value: '' },
    })

    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(replaceMock).toHaveBeenCalledWith('/search', { scroll: false })
  })
})
