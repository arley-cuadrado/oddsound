'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@payloadcms/ui'

export default function CreateRedactorButton() {
  const isEditorsView = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (!window.location.pathname.includes('/dashboard/collections/users')) return false

    return new URLSearchParams(window.location.search).get('editors') === '1'
  }, [])

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!isEditorsView) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
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

      setMessage({
        type: 'success',
        text: 'Editor creado correctamente. Ya enviamos el correo para confirmar la cuenta editor.',
      })
      setFormData({
        email: '',
        fullName: '',
        username: '',
        password: '',
        confirmPassword: '',
      })

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
        <div className="create-redactor-section__panel">
          <div className="create-redactor-section__header">
            <h3>Crear editor</h3>
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
        </div>
      )}
    </div>
  )
}
