import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CreateRedactorButton from '@/components/CreateRedactorButton'

vi.mock('@payloadcms/ui', () => ({
  Banner: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    buttonStyle: _buttonStyle,
    children,
    el: _el,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    buttonStyle?: string
    el?: string
  }) => <button {...props}>{children}</button>,
  FieldLabel: ({
    label,
    path,
    required,
  }: {
    label: string
    path: string
    required?: boolean
  }) => <label htmlFor={`field-${path.replace(/\./g, '__')}`}>{label}{required ? ' *' : ''}</label>,
  SelectInput: ({
    label,
    name,
    onChange,
    options = [],
    path,
    value,
  }: {
    label: string
    name: string
    onChange?: (value: unknown) => void
    options?: Array<{ label: string; value: string }>
    path: string
    value?: string
  }) => (
    <label htmlFor={`field-${path.replace(/\./g, '__')}`}>
      {label}
      <select
        id={`field-${path.replace(/\./g, '__')}`}
        name={name}
        onChange={(event) => onChange?.({ value: event.target.value })}
        value={value || ''}
      >
        <option value="">Seleccionar genero</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
  TextInput: ({
    label,
    onChange,
    path,
    required,
    value,
  }: {
    label: string
    onChange?: React.ChangeEventHandler<HTMLInputElement>
    path: string
    required?: boolean
    value?: string
  }) => (
    <label htmlFor={`field-${path.replace(/\./g, '__')}`}>
      {label}
      {required ? ' *' : ''}
      <input
        id={`field-${path.replace(/\./g, '__')}`}
        name={path}
        onChange={onChange}
        value={value || ''}
      />
    </label>
  ),
}))

describe('CreateRedactorButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    window.history.replaceState({}, '', '/dashboard/collections/users?editors=1')
  })

  afterEach(() => {
    cleanup()
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

  it('shows a confirmation-focused message when the editor already exists', async () => {
    const fetchMock = vi.mocked(fetch)

    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        message: 'Account with this email already exists.',
      }),
      ok: false,
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
      target: { value: 'arley.cuadrado@icloud.com' },
    })
    fireEvent.change(screen.getByLabelText('Contrasena *'), {
      target: { value: 'super-secret-password' },
    })
    fireEvent.change(screen.getByLabelText('Confirmar contrasena *'), {
      target: { value: 'super-secret-password' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Crear redactor' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Este editor ya existe o ya recibió el correo. Pídele que revise su bandeja y confirme la cuenta antes de intentar crearlo de nuevo.',
        ),
      ).toBeTruthy()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
