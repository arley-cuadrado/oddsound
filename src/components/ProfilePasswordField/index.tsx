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

  const label = useMemo(() => {
    if (typeof field.label === 'string') return field.label
    return path
  }, [field.label, path])

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
      description={field.admin?.description}
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
      required={field.required}
      value={typeof passwordField.value === 'string' ? passwordField.value : ''}
    />
  )
}
