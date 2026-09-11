'use client'

import { TextInput, useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import type React from 'react'
import { useMemo, useState } from 'react'

export default function ProfilePasswordField(props: TextFieldClientProps) {
  const { field, path } = props
  const [showPassword, setShowPassword] = useState(false)
  const passwordField = useField<string>({
    path,
  })
  const normalizedField = field && typeof field === 'object' ? field : null

  const label = useMemo(() => {
    if (typeof normalizedField?.label === 'string') return normalizedField.label
    return path
  }, [normalizedField, path])

  const description =
    normalizedField?.admin && typeof normalizedField.admin === 'object'
      ? normalizedField.admin.description
      : undefined

  return (
    <TextInput
      AfterInput={
        <button
          aria-controls={`field-${path.replace(/\./g, '__')}`}
          aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          className="field-type__toggle"
          onClick={() => setShowPassword((current) => !current)}
          type="button"
        >
          {showPassword ? 'Ocultar' : 'Ver'}
        </button>
      }
      className="payload-password-toggle-field"
      description={description}
      htmlAttributes={
        {
          autoComplete: 'new-password',
          type: showPassword ? 'text' : 'password',
        } as React.InputHTMLAttributes<HTMLInputElement>
      }
      label={label}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        passwordField.setValue(event.target.value)
      }}
      path={path}
      required={Boolean(normalizedField?.required)}
      value={typeof passwordField.value === 'string' ? passwordField.value : ''}
    />
  )
}
