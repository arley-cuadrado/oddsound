'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

import { requestCreatorPasswordReset } from '@/app/(frontend)/creator/actions'

export function CreatorForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setVerificationEmail(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || '')

    try {
      const result = await requestCreatorPasswordReset({ email })

      if (!result.ok) {
        if (result.status === 'pending_verification' && result.email) {
          setVerificationEmail(result.email)
        }

        throw new Error(result.message || 'No fue posible procesar tu solicitud.')
      }

      setSuccessMessage(result.message || 'Revisa tu correo para continuar.')
      event.currentTarget.reset()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Algo salió mal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="email">
          Correo electrónico <span className="text-[#ff6a6a]">*</span>
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-[13px] text-foreground outline-none"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      {error ? (
        <div className="space-y-3 border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <p>{error}</p>
          {verificationEmail ? (
            <Link
              className="inline-flex text-[13px] font-medium underline underline-offset-2"
              href={`/creator/register/check-email?email=${encodeURIComponent(verificationEmail)}`}
            >
              Ir a validar mi correo
            </Link>
          ) : null}
        </div>
      ) : null}

      {successMessage ? (
        <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <button
        className="mt-2 h-12 w-full bg-[#312e2e] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
      </button>
    </form>
  )
}
