'use client'

import React, { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Banner, Button, FieldLabel, Gutter, TextInput } from '@payloadcms/ui'

import {
  resendEditorInvitation,
  submitEditorInvitation,
} from '@/components/CreateRedactorButton/actions'

type CreateEditorFormState = {
  confirmPassword: string
  email: string
  fullName: string
  password: string
}

type EditorMessage = {
  email?: string
  showResend?: boolean
  text: string
  type: 'error' | 'success'
}

const INITIAL_FORM_STATE: CreateEditorFormState = {
  confirmPassword: '',
  email: '',
  fullName: '',
  password: '',
}

function PasswordInputField({
  autoComplete,
  label,
  name,
  onChange,
  required,
  showPassword,
  toggleLabel,
  onToggle,
  value,
}: {
  autoComplete?: string
  label: string
  name: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
  onToggle: () => void
  required?: boolean
  showPassword: boolean
  toggleLabel: string
  value: string
}) {
  return (
    <div className="field-type text create-redactor-section__password-field">
      <FieldLabel label={label} path={name} required={required} />
      <div className="field-type__wrap">
        <input
          autoComplete={autoComplete}
          id={`field-${name.replace(/\./g, '__')}`}
          name={name}
          onChange={onChange}
          required={required}
          type={showPassword ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-controls={`field-${name.replace(/\./g, '__')}`}
          aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          className="field-type__toggle"
          onClick={onToggle}
          type="button"
        >
          {toggleLabel}
        </button>
      </div>
    </div>
  )
}

export default function CreateRedactorButton() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isEditorsView =
    pathname?.includes('/dashboard/collections/users') && searchParams?.get('editors') === '1'

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<CreateEditorFormState>(INITIAL_FORM_STATE)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<EditorMessage | null>(null)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!isEditorsView) return null

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE)
    setMessage(null)
    setShowConfirmPassword(false)
    setShowForm(false)
    setShowPassword(false)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleResend = async () => {
    const email = message?.email?.trim() || formData.email.trim()

    if (!email) {
      setMessage({
        text: 'Necesitamos un correo electrónico para reenviar el enlace.',
        type: 'error',
      })
      return
    }

    setLoading(true)

    try {
      const result = await resendEditorInvitation({ email })

      setMessage({
        email: result.email || email,
        showResend: result.showResend,
        text: result.message,
        type: result.ok ? 'success' : 'error',
      })
    } catch (error) {
      setMessage({
        email,
        showResend: true,
        text: error instanceof Error ? error.message : 'No fue posible reenviar el correo.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (formData.password !== formData.confirmPassword) {
        setMessage({ text: 'Las contraseñas no coinciden.', type: 'error' })
        setLoading(false)
        return
      }

      if (!formData.email || !formData.fullName || !formData.password) {
        setMessage({
          text: 'Nombre completo, correo electrónico y contraseña son obligatorios.',
          type: 'error',
        })
        setLoading(false)
        return
      }

      const result = await submitEditorInvitation({
        email: formData.email,
        fullName: formData.fullName,
        password: formData.password,
      })

      setMessage({
        email: result.email,
        showResend: result.showResend,
        text: result.message,
        type: result.ok ? 'success' : 'error',
      })

      if (result.ok) {
        setFormData(INITIAL_FORM_STATE)
        setShowConfirmPassword(false)
        setShowPassword(false)
      }
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : 'No pudimos completar la creación desde este formulario.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-redactor-section">
      {!showForm ? (
        <Gutter className="create-redactor-section__launcher" left right>
          <div className="list-header">
            <div className="list-header__content">
              <div className="list-header__title-and-actions" />
              <div className="list-header__actions">
                <Button
                  onClick={() => setShowForm(true)}
                  buttonStyle="primary"
                  el="button"
                  margin={false}
                  type="button"
                >
                  Crear editor
                </Button>
              </div>
            </div>
          </div>
        </Gutter>
      ) : (
        <Gutter left right>
          <section
            aria-labelledby="create-redactor-title"
            className="create-redactor-section__content collection-list__sub-header"
          >
            <div className="list-header create-redactor-section__header">
              <div className="list-header__content">
                <div className="list-header__title-and-actions">
                  <h2 className="list-header__title" id="create-redactor-title">
                    Crear editor
                  </h2>
                </div>
                <div className="list-header__actions">
                  <Button
                    onClick={resetForm}
                    buttonStyle="secondary"
                    el="button"
                    margin={false}
                    type="button"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>

            <p className="create-redactor-section__description">
              El editor recibirá un correo de confirmación antes de iniciar sesión.
            </p>

            {message ? (
              <Banner type={message.type === 'success' ? 'success' : 'error'}>
                <div className="create-redactor-section__message">
                  <p>{message.text}</p>
                  {message.showResend ? (
                    <Button
                      onClick={handleResend}
                      buttonStyle="secondary"
                      disabled={loading}
                      el="button"
                      margin={false}
                      type="button"
                    >
                      {loading ? 'Reenviando...' : 'Reenviar correo de confirmación'}
                    </Button>
                  ) : null}
                </div>
              </Banner>
            ) : null}

            <form className="create-redactor-section__form" onSubmit={handleSubmit}>
              <TextInput
                label="Nombre completo"
                onChange={handleChange}
                path="fullName"
                placeholder="Nombre completo del editor"
                required
                value={formData.fullName}
              />

              <TextInput
                htmlAttributes={{
                  autoComplete: 'email',
                }}
                label="Correo electrónico"
                onChange={handleChange}
                path="email"
                placeholder="editor@oddsound.co"
                required
                value={formData.email}
              />

              <PasswordInputField
                autoComplete="new-password"
                label="Contraseña"
                name="password"
                onChange={handleChange}
                onToggle={() => setShowPassword((current) => !current)}
                required
                showPassword={showPassword}
                toggleLabel={showPassword ? 'Ocultar' : 'Ver'}
                value={formData.password}
              />

              <PasswordInputField
                autoComplete="new-password"
                label="Confirmar contraseña"
                name="confirmPassword"
                onChange={handleChange}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                required
                showPassword={showConfirmPassword}
                toggleLabel={showConfirmPassword ? 'Ocultar' : 'Ver'}
                value={formData.confirmPassword}
              />

              <div className="create-redactor-section__actions">
                <Button type="submit" buttonStyle="primary" disabled={loading} el="button" margin={false}>
                  {loading ? 'Creando...' : 'Crear editor'}
                </Button>
                <Button onClick={resetForm} buttonStyle="secondary" el="button" margin={false} type="button">
                  Cancelar
                </Button>
              </div>
            </form>
          </section>
        </Gutter>
      )}
    </div>
  )
}
