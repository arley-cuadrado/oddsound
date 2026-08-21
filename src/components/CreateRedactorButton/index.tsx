'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@payloadcms/ui'

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

function hasAtLeastOneSocialLink(socials: EditorSocials) {
  return Object.values(socials).some((value) => value.trim().length > 0)
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

      if (!formData.editorGender) {
        setMessage({
          type: 'error',
          text: 'El genero del editor es obligatorio.',
        })
        setLoading(false)
        return
      }

      if (!hasAtLeastOneSocialLink(formData.socials)) {
        setMessage({
          type: 'error',
          text: 'Debes registrar al menos una red social del editor.',
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
            <div
              className={
                message.type === 'success'
                  ? 'create-redactor-section__message is-success'
                  : 'create-redactor-section__message is-error'
              }
            >
              {message.text}
            </div>
          ) : null}

          <form className="create-redactor-section__form" onSubmit={handleSubmit}>
            <div className="create-redactor-section__field">
              <label htmlFor="editor-full-name">Nombre completo *</label>
              <input
                id="editor-full-name"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nombre completo del redactor"
                required
              />
            </div>

            <div className="create-redactor-section__field">
              <label htmlFor="editor-username">Nombre de usuario *</label>
              <input
                id="editor-username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="nombre.usuario"
                required
              />
            </div>

            <div className="create-redactor-section__field">
              <label htmlFor="editor-email">Email *</label>
              <input
                id="editor-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="redactor@example.com"
                required
              />
            </div>

            <div className="create-redactor-section__field">
              <label htmlFor="editor-password">Contrasena *</label>
              <input
                id="editor-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Contrasena"
                required
              />
            </div>

            <div className="create-redactor-section__field">
              <label htmlFor="editor-password-confirm">Confirmar contrasena *</label>
              <input
                id="editor-password-confirm"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirmar contrasena"
                required
              />
            </div>

            <div className="create-redactor-section__field">
              <label htmlFor="editor-gender">Genero del editor *</label>
              <select
                id="editor-gender"
                name="editorGender"
                value={formData.editorGender}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar genero</option>
                <option value="male">Hombre</option>
                <option value="female">Mujer</option>
                <option value="indeterminate">Indeterminado</option>
              </select>
            </div>

            <fieldset className="create-redactor-section__group">
              <legend>Redes sociales *</legend>
              <p className="create-redactor-section__hint">
                Registra al menos una para completar el perfil editorial.
              </p>

              <div className="create-redactor-section__social-grid">
                <div className="create-redactor-section__field">
                  <label htmlFor="editor-instagram">Instagram</label>
                  <input
                    id="editor-instagram"
                    type="text"
                    name="socials.instagram"
                    value={formData.socials.instagram}
                    onChange={handleChange}
                    placeholder="@usuario o URL"
                  />
                </div>

                <div className="create-redactor-section__field">
                  <label htmlFor="editor-x">X</label>
                  <input
                    id="editor-x"
                    type="text"
                    name="socials.x"
                    value={formData.socials.x}
                    onChange={handleChange}
                    placeholder="@usuario o URL"
                  />
                </div>

                <div className="create-redactor-section__field">
                  <label htmlFor="editor-threads">Threads</label>
                  <input
                    id="editor-threads"
                    type="text"
                    name="socials.threads"
                    value={formData.socials.threads}
                    onChange={handleChange}
                    placeholder="@usuario o URL"
                  />
                </div>

                <div className="create-redactor-section__field">
                  <label htmlFor="editor-facebook">Facebook</label>
                  <input
                    id="editor-facebook"
                    type="text"
                    name="socials.facebook"
                    value={formData.socials.facebook}
                    onChange={handleChange}
                    placeholder="Perfil o URL"
                  />
                </div>
              </div>
            </fieldset>

            <div className="create-redactor-section__actions">
              <Button type="submit" buttonStyle="primary" disabled={loading} el="button">
                {loading ? 'Creando...' : 'Crear redactor'}
              </Button>
              <Button
                onClick={() => {
                  setShowForm(false)
                  setMessage(null)
                }}
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
