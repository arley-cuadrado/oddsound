import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CreateRedactorButton from '@/components/CreateRedactorButton'

vi.mock('@payloadcms/ui', () => ({
  Button: ({
    buttonStyle: _buttonStyle,
    children,
    el: _el,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    buttonStyle?: string
    el?: string
  }) => <button {...props}>{children}</button>,
}))

describe('CreateRedactorButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    window.history.replaceState({}, '', '/dashboard/collections/users?editors=1')
  })

  it('allows creating an editor without gender or social links', async () => {
    const fetchMock = vi.mocked(fetch)

    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ profile: 'profile-1' }),
        ok: true,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({}),
        ok: true,
      } as Response)

    render(React.createElement(CreateRedactorButton))

    fireEvent.click(screen.getByRole('button', { name: 'Crear editor' }))

    fireEvent.change(screen.getByLabelText('Nombre completo *'), {
      target: { value: 'Arlo Cuadrado' },
    })
    fireEvent.change(screen.getByLabelText('Nombre de usuario *'), {
      target: { value: 'arlo_cuadrado' },
    })
    fireEvent.change(screen.getByLabelText('Email *'), {
      target: { value: 'arley.cuadradosierra@gmail.com' },
    })
    fireEvent.change(screen.getByLabelText('Contrasena *'), {
      target: { value: 'super-secret-password' },
    })
    fireEvent.change(screen.getByLabelText('Confirmar contrasena *'), {
      target: { value: 'super-secret-password' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Crear redactor' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/users',
      expect.objectContaining({
        body: JSON.stringify({
          editorAccess: true,
          email: 'arley.cuadradosierra@gmail.com',
          name: 'Arlo Cuadrado',
          password: 'super-secret-password',
          role: 'creator',
          username: 'arlo_cuadrado',
        }),
        method: 'POST',
      }),
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/profiles/profile-1',
      expect.objectContaining({
        body: JSON.stringify({
          editorGender: '',
          editorSocials: {
            facebook: '',
            instagram: '',
            threads: '',
            x: '',
          },
        }),
        method: 'PATCH',
      }),
    )
  })
})
