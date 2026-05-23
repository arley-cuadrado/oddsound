'use client'

import { resendVerificationEmail } from '@/app/(frontend)/creator/actions'
import { useState } from 'react'

type Props = {
  email: string
}

export function VerificationResendForm({ email }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isError, setIsError] = useState(false)

  async function handleResend() {
    setFeedback(null)
    setIsError(false)
    setIsSubmitting(true)

    try {
      const result = await resendVerificationEmail({ email })

      setIsError(!result.ok)
      setFeedback(result.message || (result.ok ? 'Correo enviado.' : 'No fue posible reenviar el correo.'))
    } catch (error) {
      setIsError(true)
      setFeedback(error instanceof Error ? error.message : 'No fue posible reenviar el correo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        className="h-12 w-full border border-border bg-background px-4 text-[13px] font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        onClick={handleResend}
        type="button"
      >
        {isSubmitting ? 'Enviando...' : 'Reenviar correo'}
      </button>

      {feedback ? (
        <p
          className={`px-4 py-3 text-[13px] ${
            isError
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  )
}
