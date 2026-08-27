'use client'

import React, { useMemo, useState } from 'react'
import { Banner, Button, FieldLabel, SelectInput, TextInput } from '@payloadcms/ui'
import type { OptionObject } from 'payload'

type EditorGender = 'female' | 'indeterminate' | 'male'

type EditorSocials = {
  facebook: string
  instagram: string
  threads: string
  x: string
}

type CreateEditorFormState = {
  confirmPassword: string
  editorGender: EditorGender | ''
  email: string
  fullName: string
  password: string
  socials: EditorSocials
  username: string
}

const INITIAL_FORM_STATE: CreateEditorFormState = {
  confirmPassword: '',
  editorGender: '',
  email: '',
  fullName: '',
  password: '',
  socials: {
    facebook: '',
    instagram: '',
    threads: '',
    x: '',
  },
  username: '',
}

const EDITOR_GENDER_OPTIONS: OptionObject[] = [
  {
    label: 'Hombre',
    value: 'male',
  },
  {
    label: 'Mujer',
    value: 'female',
  },
  {
    label: 'Indeterminado',
    value: 'indeterminate',
  },
]

function DashboardInputField({
  autoComplete,
  label,
  name,
  onChange,
  placeholder,
  required,
  type,
  value,
}: {
  autoComplete?: string
  label: string
  name: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
  placeholder?: string
  required?: boolean
  type: 'email' | 'password' | 'text'
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
          placeholder={placeholder}
          required={required}
          type={type}
          value={value}
        />
      </div>
    </div>
  )
}

function extractProfileID(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const candidate =
    'profile' in payload
      ? payload.profile
      : 'doc' in payload && payload.doc && typeof payload.doc === 'object' && 'profile' in payload.doc
        ? payload.doc.profile
        : null

  if (typeof candidate === 'string') return candidate
  if (candidate && typeof candidate === 'object' && 'id' in candidate && typeof candidate.id === 'string') {
    return candidate.id
  }

  return null
}

export default function CreateRedactorButton() {
  const isEditorsView = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (!window.location.pathname.includes('/dashboard/collections/users')) return false

    return new URLSearchParams(window.location.search).get('editors') === '1'
  }, [])

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<CreateEditorFormState>(INITIAL_FORM_STATE)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!isEditorsView) return null

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE)
    setMessage(null)
    setShowForm(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    if (name.startsWith('socials.')) {
      const socialKey = name.replace('socials.', '') as keyof EditorSocials

      setFormData((prev) => ({
        ...prev,
        socials: {
          ...prev.socials,
          [socialKey]: value,
        },
      }))

      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (formData.password !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Las contrasenas no coinciden.' })
        setLoading(false)
        return
      }

      if (!formData.email || !formData.fullName || !formData.username || !formData.password) {
        setMessage({
          type: 'error',
          text: 'Email, nombre completo, username y contrasena son obligatorios.',
        })
        setLoading(false)
        return
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editorAccess: true,
          email: formData.email,
          name: formData.fullName,
          password: formData.password,
          role: 'creator',
          username: formData.username,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'No fue posible crear el redactor.')
      }

      const createdUser = await response.json()
      const profileID = extractProfileID(createdUser)

      if (!profileID) {
        throw new Error(
          'La cuenta se creo, pero no fue posible localizar el perfil editorial para guardar genero y redes sociales.',
        )
      }

      const profileResponse = await fetch(`/api/profiles/${profileID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editorGender: formData.editorGender,
          editorSocials: formData.socials,
        }),
      })

      if (!profileResponse.ok) {
        const error = await profileResponse.json().catch(() => null)
        throw new Error(
          error?.message ||
            'La cuenta se creo, pero no fue posible guardar el perfil editorial con genero y redes sociales.',
        )
      }

      setMessage({
        type: 'success',
        text: 'Editor creado correctamente. Ya enviamos el correo para confirmar la cuenta editor.',
      })
      setFormData(INITIAL_FORM_STATE)

      setTimeout(() => {
        window.location.reload()
      }, 1200)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No fue posible crear el redactor.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-redactor-section">
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          buttonStyle="primary"
          el="button"
          type="button"
        >
          Crear editor
        </Button>
      ) : (
        <section className="create-redactor-section__content" aria-labelledby="create-redactor-title">
          <div className="create-redactor-section__header">
            <h3 id="create-redactor-title">Crear editor</h3>
            <p>
              Los nuevos editores reciben un correo para confirmar su cuenta y luego iniciar
              sesion.
            </p>
          </div>

          {message ? (
            <Banner type={message.type === 'success' ? 'success' : 'error'}>{message.text}</Banner>
          ) : null}

          <form className="create-redactor-section__form" onSubmit={handleSubmit}>
            <TextInput
              label="Nombre completo"
              onChange={handleChange}
              path="fullName"
              placeholder="Nombre completo del redactor"
              required
              value={formData.fullName}
            />

            <TextInput
              label="Nombre de usuario"
              onChange={handleChange}
              path="username"
              placeholder="nombre.usuario"
              required
              value={formData.username}
            />

            <DashboardInputField
              autoComplete="email"
              label="Email"
              name="email"
              onChange={handleChange as React.ChangeEventHandler<HTMLInputElement>}
              placeholder="redactor@example.com"
              required
              type="email"
              value={formData.email}
            />

            <DashboardInputField
              autoComplete="new-password"
              label="Contrasena"
              name="password"
              onChange={handleChange as React.ChangeEventHandler<HTMLInputElement>}
              placeholder="Contrasena"
              required
              type="password"
              value={formData.password}
            />

            <DashboardInputField
              autoComplete="new-password"
              label="Confirmar contrasena"
              name="confirmPassword"
              onChange={handleChange as React.ChangeEventHandler<HTMLInputElement>}
              placeholder="Confirmar contrasena"
              required
              type="password"
              value={formData.confirmPassword}
            />

            <SelectInput
              isClearable
              label="Genero del editor"
              name="editorGender"
              onChange={(option) => {
                const nextValue =
                  option && !Array.isArray(option) && typeof option === 'object' && 'value' in option
                    ? String(option.value || '')
                    : ''

                setFormData((prev) => ({
                  ...prev,
                  editorGender: nextValue as EditorGender | '',
                }))
              }}
              options={EDITOR_GENDER_OPTIONS}
              path="editorGender"
              placeholder="Seleccionar genero"
              value={formData.editorGender}
            />

            <fieldset className="create-redactor-section__group">
              <legend>Redes sociales</legend>
              <p className="create-redactor-section__hint">
                Puedes agregarlas ahora o mas tarde.
              </p>

              <div className="create-redactor-section__social-grid">
                <TextInput
                  label="Instagram"
                  onChange={handleChange}
                  path="socials.instagram"
                  placeholder="@usuario o URL"
                  value={formData.socials.instagram}
                />

                <TextInput
                  label="X"
                  onChange={handleChange}
                  path="socials.x"
                  placeholder="@usuario o URL"
                  value={formData.socials.x}
                />

                <TextInput
                  label="Threads"
                  onChange={handleChange}
                  path="socials.threads"
                  placeholder="@usuario o URL"
                  value={formData.socials.threads}
                />

                <TextInput
                  label="Facebook"
                  onChange={handleChange}
                  path="socials.facebook"
                  placeholder="Perfil o URL"
                  value={formData.socials.facebook}
                />
              </div>
            </fieldset>

            <div className="create-redactor-section__actions">
              <Button type="submit" buttonStyle="primary" disabled={loading} el="button">
                {loading ? 'Creando...' : 'Crear redactor'}
              </Button>
              <Button
                onClick={resetForm}
                buttonStyle="secondary"
                el="button"
                type="button"
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
