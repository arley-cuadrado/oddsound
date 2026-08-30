import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CreateRedactorButton from '@/components/CreateRedactorButton'

const actionMocks = vi.hoisted(() => ({
  resendEditorInvitation: vi.fn(),
  submitEditorInvitation: vi.fn(),
}))

vi.mock('@/components/CreateRedactorButton/actions', () => ({
  resendEditorInvitation: actionMocks.resendEditorInvitation,
  submitEditorInvitation: actionMocks.submitEditorInvitation,
}))

const searchParamsState = {
  value: 'editors=1',
}

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/collections/users',
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}))

vi.mock('@payloadcms/ui', () => ({
  Banner: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  FieldLabel: ({
    label,
    path,
    required,
  }: {
    label: string
    path: string
    required?: boolean
  }) => <label htmlFor={`field-${path.replace(/\./g, '__')}`}>{label}{required ? ' *' : ''}</label>,
  Gutter: ({
    children,
    className,
  }: {
    children?: React.ReactNode
    className?: string
  }) => <div className={className}>{children}</div>,
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
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
  TextInput: ({
    htmlAttributes,
    label,
    onChange,
    path,
    required,
    value,
  }: {
    htmlAttributes?: Record<string, string>
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
        {...htmlAttributes}
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
    actionMocks.submitEditorInvitation.mockReset()
    actionMocks.resendEditorInvitation.mockReset()
    window.history.replaceState({}, '', '/dashboard/collections/users?editors=1')
  })

  afterEach(() => {
    cleanup()
  })

  it('creates an editor with only the required fields', async () => {
    actionMocks.submitEditorInvitation.mockResolvedValue({
      email: 'arley.cuadradosierra@gmail.com',
      message: 'Editor creado correctamente. Ya enviamos el correo para confirmar la cuenta.',
      ok: true,
      showResend: false,
      status: 'created_and_sent',
    })

    render(React.createElement(CreateRedactorButton))

    fireEvent.click(screen.getByRole('button', { name: 'Crear editor' }))

    fireEvent.change(screen.getByLabelText('Nombre completo *'), {
      target: { value: 'Arlo Cuadrado' },
    })
    fireEvent.change(screen.getByLabelText('Correo electrónico *'), {
      target: { value: 'arley.cuadradosierra@gmail.com' },
    })
    fireEvent.change(screen.getByLabelText('Contraseña *'), {
      target: { value: 'super-secret-password' },
    })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), {
      target: { value: 'super-secret-password' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Crear editor' }))

    await waitFor(() => {
      expect(actionMocks.submitEditorInvitation).toHaveBeenCalledWith({
        email: 'arley.cuadradosierra@gmail.com',
        fullName: 'Arlo Cuadrado',
        password: 'super-secret-password',
        socialRows: [],
      })
    })

    expect(screen.queryByLabelText('Nombre de usuario *')).toBeNull()
    expect(screen.queryByLabelText('Genero del editor')).toBeNull()
  })

  it('shows the launcher as soon as the editors query is present', async () => {
    searchParamsState.value = ''

    const { rerender } = render(React.createElement(CreateRedactorButton))

    expect(screen.queryByRole('button', { name: 'Crear editor' })).toBeNull()

    searchParamsState.value = 'editors=1'
    rerender(React.createElement(CreateRedactorButton))

    expect(screen.getByRole('button', { name: 'Crear editor' })).toBeTruthy()
  })

  it('shows resend action when the editor already exists without verification', async () => {
    actionMocks.submitEditorInvitation.mockResolvedValue({
      email: 'editor@oddsound.co',
      message:
        'Este editor ya existe y sigue pendiente de confirmar su correo. Puedes reenviar el enlace desde aquí.',
      ok: false,
      showResend: true,
      status: 'existing_pending_verification',
    })

    actionMocks.resendEditorInvitation.mockResolvedValue({
      email: 'editor@oddsound.co',
      message: 'Te enviamos un nuevo enlace de verificación.',
      ok: true,
      showResend: false,
      status: 'created_and_sent',
    })

    render(React.createElement(CreateRedactorButton))

    fireEvent.click(screen.getByRole('button', { name: 'Crear editor' }))
    fireEvent.change(screen.getByLabelText('Nombre completo *'), {
      target: { value: 'Editor Test' },
    })
    fireEvent.change(screen.getByLabelText('Correo electrónico *'), {
      target: { value: 'editor@oddsound.co' },
    })
    fireEvent.change(screen.getByLabelText('Contraseña *'), {
      target: { value: 'super-secret-password' },
    })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), {
      target: { value: 'super-secret-password' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Crear editor' }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Reenviar correo de confirmación' }),
      ).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar correo de confirmación' }))

    await waitFor(() => {
      expect(actionMocks.resendEditorInvitation).toHaveBeenCalledWith({
        email: 'editor@oddsound.co',
      })
    })
  })

  it('toggles password visibility for both password fields', async () => {
    render(React.createElement(CreateRedactorButton))

    fireEvent.click(screen.getByRole('button', { name: 'Crear editor' }))

    const passwordInput = screen.getByLabelText('Contraseña *') as HTMLInputElement
    const confirmPasswordInput = screen.getByLabelText('Confirmar contraseña *') as HTMLInputElement

    expect(passwordInput.type).toBe('password')
    expect(confirmPasswordInput.type).toBe('password')

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver contraseña' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver contraseña' })[0])

    expect(passwordInput.type).toBe('text')
    expect(confirmPasswordInput.type).toBe('text')
  })
})
