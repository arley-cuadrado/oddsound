'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

import { requestCreatorPasswordReset } from '@/app/(frontend)/creator/actions'

export function CreatorForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMissingUser, setIsMissingUser] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget

    setError(null)
    setIsMissingUser(false)
    setSuccessMessage(null)
    setVerificationEmail(null)
    setIsSubmitting(true)

    const formData = new FormData(form)
    const email = String(formData.get('email') || '')

    try {
      const result = await requestCreatorPasswordReset({ email })

      if (!result.ok) {
        if (result.status === 'not_found') {
          setIsMissingUser(true)
        }

        if (result.status === 'pending_verification' && result.email) {
          setVerificationEmail(result.email)
        }

        throw new Error(result.message || 'No fue posible procesar tu solicitud.')
      }

      setSuccessMessage(result.message || 'Revisa tu correo para continuar.')
      form.reset()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Algo salió mal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {!successMessage ? (
        <>
          <div className="space-y-2">
            <p className="text-[13px] text-foreground/80">Recupera el acceso a tu cuenta.</p>
            <p className="text-[13px] text-foreground/80">
              Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground" htmlFor="email">
                Correo electrónico <span className="text-[#ff6a6a]">*</span>
              </label>
              <input
                className="h-12 w-full border border-border bg-background px-4 text-base text-foreground outline-none md:text-[13px]"
                id="email"
                name="email"
                required
                type="email"
              />
            </div>

            {error ? (
              <div className="space-y-3 border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {isMissingUser ? (
                  <p>
                    No encontramos una cuenta de creador con ese correo.{' '}
                    <Link className="font-medium underline underline-offset-2" href="/creator/register">
                      Regístrate
                    </Link>{' '}
                    para continuar.
                  </p>
                ) : (
                  <p>{error}</p>
                )}
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

            <button
              className="mt-2 h-12 w-full bg-[#312e2e] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        </>
      ) : (
        <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          {successMessage}
        </p>
      )}
    </div>
  )
}
