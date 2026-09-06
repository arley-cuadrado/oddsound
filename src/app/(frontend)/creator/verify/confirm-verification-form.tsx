'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { confirmCreatorVerificationAction } from '@/app/(frontend)/creator/actions'
import { VerificationResendForm } from '@/app/(frontend)/creator/verification-resend-form'

type Props = {
  email: string
  token: string
}

type VerificationState = {
  isError: boolean
  message: string
  ok: boolean
}

export function ConfirmVerificationForm({ email, token }: Props) {
  const hasStartedRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<null | VerificationState>(null)

  async function runConfirmation() {
    setIsSubmitting(true)

    try {
      const nextResult = await confirmCreatorVerificationAction({ email, token })

      setResult({
        isError: !nextResult.ok,
        message:
          nextResult.message ||
          (nextResult.ok
            ? 'Tu correo fue confirmado correctamente. Ya puedes iniciar sesión.'
            : 'No fue posible confirmar el correo electrónico.'),
        ok: nextResult.ok,
      })
    } catch (error) {
      setResult({
        isError: true,
        message:
          error instanceof Error ? error.message : 'No fue posible confirmar el correo electrónico.',
        ok: false,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (hasStartedRef.current) return

    hasStartedRef.current = true
    void runConfirmation()
  }, [])

  if (result?.ok) {
    return (
      <div className="space-y-4">
        <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          {result.message}
        </p>
        <Link
          className="inline-flex h-12 w-full items-center justify-center bg-[#312e2e] px-4 text-[13px] font-medium text-white"
          href="/dashboard/login"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isSubmitting && !result ? (
        <p className="border border-border bg-background px-4 py-3 text-[13px] text-foreground/80">
          Confirmando tu correo...
        </p>
      ) : null}

      {result?.message ? (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {result.message}
        </p>
      ) : null}

      <button
        className="h-12 w-full bg-[#312e2e] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        onClick={() => void runConfirmation()}
        type="button"
      >
        {isSubmitting ? 'Confirmando...' : result ? 'Volver a intentar' : 'Confirmar correo'}
      </button>

      <VerificationResendForm email={email} />

      <Link
        className="inline-flex h-12 w-full items-center justify-center border border-border bg-background px-4 text-[13px] font-medium text-foreground"
        href="/creator/register"
      >
        Volver al registro
      </Link>
    </div>
  )
}
