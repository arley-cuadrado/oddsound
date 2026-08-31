import Link from 'next/link'

import config from '@payload-config'
import { getPayload } from 'payload'

import { VerificationResendForm } from '@/app/(frontend)/creator/verification-resend-form'
import { findUserByEmail } from '@/utilities/creatorAuth'
import { CreatorAuthShell } from '../auth-shell'

type Props = {
  searchParams: Promise<{
    email?: string
    token?: string
  }>
}

export default async function CreatorVerifyView({ searchParams }: Props) {
  const payload = await getPayload({ config })
  const { email, token } = await searchParams
  const normalizedEmail = email?.trim().toLowerCase()

  let isVerified = false
  let message = 'El enlace no es válido o ya expiró.'
  const existingUser = normalizedEmail ? await findUserByEmail(normalizedEmail, payload) : null

  if (existingUser?._verified) {
    isVerified = true
    message = 'Tu correo ya había sido confirmado. Ya puedes iniciar sesión.'
  }

  if (!isVerified && token) {
    try {
      await payload.verifyEmail({
        collection: 'users',
        token,
      })

      isVerified = true
      message = 'Tu correo fue confirmado correctamente. Ya puedes iniciar sesión.'
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : message

      if (existingUser?._verified) {
        isVerified = true
        message = 'Tu correo ya había sido confirmado. Ya puedes iniciar sesión.'
      } else {
        message = errorMessage
      }
    }
  }

  return (
    <CreatorAuthShell
      intro={
        <div className="space-y-3">
          <p className="text-[13px] text-foreground/80">Validación de correo</p>
          <h1 className="text-2xl font-medium text-foreground">
            {isVerified ? 'Correo confirmado' : 'No pudimos validar el enlace'}
          </h1>
          <p className="text-[13px] leading-6 text-foreground/80">{message}</p>
        </div>
      }
    >
      {isVerified ? (
        <Link
          className="inline-flex h-12 w-full items-center justify-center bg-[#312e2e] px-4 text-[13px] font-medium text-white"
          href="/creator/login"
        >
          Ir a iniciar sesión
        </Link>
      ) : (
        <div className="space-y-4">
          {normalizedEmail ? <VerificationResendForm email={normalizedEmail} /> : null}
          <Link
            className="inline-flex h-12 w-full items-center justify-center border border-border bg-background px-4 text-[13px] font-medium text-foreground"
            href="/creator/register"
          >
            Volver al registro
          </Link>
        </div>
      )}
    </CreatorAuthShell>
  )
}
