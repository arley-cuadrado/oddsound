'use client'

import React, { useMemo, useState } from 'react'
import { Banner, Button, FieldLabel, SelectInput, TextInput } from '@payloadcms/ui'

import {
  resendEditorInvitation,
  submitEditorInvitation,
} from '@/components/CreateRedactorButton/actions'
import type { EditorSocialPlatform, EditorSocialRow } from '@/utilities/editorInvites'

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

type SocialRowState = EditorSocialRow & {
  id: string
}

const INITIAL_FORM_STATE: CreateEditorFormState = {
  confirmPassword: '',
  email: '',
  fullName: '',
  password: '',
}

const SOCIAL_PLATFORM_OPTIONS = [
  {
    label: 'Instagram',
    value: 'instagram',
  },
  {
    label: 'X',
    value: 'x',
  },
  {
    label: 'Threads',
    value: 'threads',
  },
  {
    label: 'Facebook',
    value: 'facebook',
  },
]

function createSocialRow(): SocialRowState {
  return {
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `social-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    platform: 'instagram',
    value: '',
  }
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
    <div className="field-type text">
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
  const isEditorsView = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (!window.location.pathname.includes('/dashboard/collections/users')) return false

    return new URLSearchParams(window.location.search).get('editors') === '1'
  }, [])

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<CreateEditorFormState>(INITIAL_FORM_STATE)
  const [socialRows, setSocialRows] = useState<SocialRowState[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<EditorMessage | null>(null)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!isEditorsView) return null

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE)
    setSocialRows([])
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

  const handleSocialPlatformChange = (id: string, nextValue: string) => {
    setSocialRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, platform: nextValue as EditorSocialPlatform } : row,
      ),
    )
  }

  const handleSocialValueChange = (id: string, nextValue: string) => {
    setSocialRows((prev) => prev.map((row) => (row.id === id ? { ...row, value: nextValue } : row)))
  }

  const addSocialRow = () => {
    setSocialRows((prev) => [...prev, createSocialRow()])
  }

  const removeSocialRow = (id: string) => {
    setSocialRows((prev) => prev.filter((row) => row.id !== id))
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
        socialRows: socialRows
          .map(({ platform, value }) => ({
            platform,
            value,
          }))
          .filter((row) => row.value.trim()),
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
        setSocialRows([])
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
        <Button onClick={() => setShowForm(true)} buttonStyle="primary" el="button" type="button">
          Crear editor
        </Button>
      ) : (
        <section className="create-redactor-section__content" aria-labelledby="create-redactor-title">
          <div className="create-redactor-section__header">
            <h3 id="create-redactor-title">Crear editor</h3>
            <p>El editor recibirá un correo de confirmación antes de iniciar sesión.</p>
          </div>

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

            <fieldset className="create-redactor-section__group">
              <legend>Redes sociales</legend>
              <p className="create-redactor-section__hint">Puedes agregarlas ahora o más tarde.</p>

              {socialRows.map((row, index) => (
                <div className="create-redactor-section__social-row" key={row.id}>
                  <SelectInput
                    label={`Red social ${index + 1}`}
                    name={`social-platform-${row.id}`}
                    onChange={(option) => {
                      const nextValue =
                        option && !Array.isArray(option) && typeof option === 'object' && 'value' in option
                          ? String(option.value || '')
                          : ''

                      handleSocialPlatformChange(row.id, nextValue)
                    }}
                    options={SOCIAL_PLATFORM_OPTIONS}
                    path={`social-platform-${row.id}`}
                    value={row.platform}
                  />

                  <TextInput
                    label="Usuario o URL"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      handleSocialValueChange(row.id, event.target.value)
                    }
                    path={`social-value-${row.id}`}
                    placeholder="@usuario o URL"
                    value={row.value}
                  />

                  <Button
                    onClick={() => removeSocialRow(row.id)}
                    buttonStyle="secondary"
                    el="button"
                    type="button"
                  >
                    Eliminar
                  </Button>
                </div>
              ))}

              <Button onClick={addSocialRow} buttonStyle="secondary" el="button" type="button">
                Agregar red social
              </Button>
            </fieldset>

            <div className="create-redactor-section__actions">
              <Button type="submit" buttonStyle="primary" disabled={loading} el="button">
                {loading ? 'Creando...' : 'Crear editor'}
              </Button>
              <Button onClick={resetForm} buttonStyle="secondary" el="button" type="button">
                Cancelar
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
