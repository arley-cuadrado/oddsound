'use client'

import React, { useState } from 'react'
import { Button } from '@payloadcms/ui'

export default function CreateRedactorButton() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
        setLoading(false)
        return
      }

      // Validate all fields are filled
      if (!formData.email || !formData.name || !formData.password) {
        setMessage({ type: 'error', text: 'Todos los campos son obligatorios' })
        setLoading(false)
        return
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          role: 'creator',
          accountType: 'artist',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al crear el redactor')
      }

      setMessage({
        type: 'success',
        text: 'Redactor creado exitosamente. Se ha enviado un correo de verificación.',
      })
      setFormData({
        email: '',
        name: '',
        password: '',
        confirmPassword: '',
      })

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al crear el redactor',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-redactor-section" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          buttonStyle="primary"
          el="button"
          type="button"
        >
          + Crear Nuevo Redactor
        </Button>
      ) : (
        <div
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            backgroundColor: '#f9f9f9',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Crear Nuevo Redactor</h3>

          {message && (
            <div
              style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                borderRadius: '0.25rem',
                backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
                color: message.type === 'success' ? '#155724' : '#721c24',
                border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
              }}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                }}
              >
                Nombre *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nombre del redactor"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.25rem',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                }}
              >
                Correo Electrónico *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="redactor@example.com"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.25rem',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                }}
              >
                Contraseña *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Contraseña"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.25rem',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                }}
              >
                Confirmar Contraseña *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirmar contraseña"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.25rem',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                type="submit"
                buttonStyle="primary"
                disabled={loading}
                el="button"
              >
                {loading ? 'Creando...' : 'Crear Redactor'}
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
