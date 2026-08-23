import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Search } from '@/search/Component'

const PLACEHOLDER = 'Comienza a descubrir ;)'

describe('Search', () => {
  afterEach(() => {
    cleanup()
  })

  it('reports every keystroke so results filter while typing', () => {
    const onValueChange = vi.fn()

    render(React.createElement(Search, { onValueChange, value: '' }))

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: 'indie rock' },
    })

    expect(onValueChange).toHaveBeenCalledWith('indie rock')
  })

  it('does not navigate when the form is submitted', () => {
    const onValueChange = vi.fn()

    render(React.createElement(Search, { onValueChange, value: 'indie rock' }))

    const form = screen.getByPlaceholderText(PLACEHOLDER).closest('form') as HTMLFormElement
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true })

    form.dispatchEvent(submitEvent)

    expect(submitEvent.defaultPrevented).toBe(true)
  })

  it('exposes a clear action only when there is a value', () => {
    const onValueChange = vi.fn()
    const { rerender } = render(React.createElement(Search, { onValueChange, value: '' }))

    expect(screen.queryByRole('button', { name: 'Limpiar búsqueda' })).toBeNull()

    rerender(React.createElement(Search, { onValueChange, value: 'indie rock' }))
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))

    expect(onValueChange).toHaveBeenCalledWith('')
  })
})
