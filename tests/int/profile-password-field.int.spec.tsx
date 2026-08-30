import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ProfilePasswordField from '@/components/ProfilePasswordField'

const useFieldMock = vi.fn()

vi.mock('@payloadcms/ui', () => ({
  TextInput: ({
    AfterInput,
    htmlAttributes,
    label,
    onChange,
    path,
    required,
    value,
  }: {
    AfterInput?: React.ReactNode
    htmlAttributes?: React.InputHTMLAttributes<HTMLInputElement>
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
      {AfterInput}
    </label>
  ),
  useField: () => useFieldMock(),
}))

describe('ProfilePasswordField', () => {
  afterEach(() => {
    cleanup()
    useFieldMock.mockReset()
  })

  it('falls back to the field path when Payload does not provide field metadata', () => {
    useFieldMock.mockReturnValue({
      setValue: vi.fn(),
      value: '',
    })

    render(React.createElement(ProfilePasswordField, { field: null, path: 'editorPassword' } as any))

    expect(screen.getByLabelText('editorPassword')).toBeTruthy()
  })

  it('toggles visibility and updates the field value', () => {
    const setValue = vi.fn()

    useFieldMock.mockReturnValue({
      setValue,
      value: '',
    })

    render(
      React.createElement(ProfilePasswordField, {
        field: {
          admin: {
            description: 'Password',
          },
          label: 'Nueva contraseña',
          required: true,
        },
        path: 'editorPassword',
      } as any),
    )

    const input = screen.getByLabelText('Nueva contraseña *')
    expect(input.getAttribute('type')).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Ver contraseña' }))
    expect(input.getAttribute('type')).toBe('text')

    fireEvent.change(input, {
      target: { value: 'nueva-clave-segura' },
    })

    expect(setValue).toHaveBeenCalledWith('nueva-clave-segura')
  })
})
