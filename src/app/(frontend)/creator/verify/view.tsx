import Link from 'next/link'

import { findUserByEmail } from '@/utilities/creatorAuth'
import { CreatorAuthShell } from '../auth-shell'
import { ConfirmVerificationForm } from './confirm-verification-form'

type Props = {
  searchParams: Promise<{
    email?: string
    token?: string
  }>
}

export default async function CreatorVerifyView({ searchParams }: Props) {
  const { email, token } = await searchParams
  const normalizedEmail = email?.trim().toLowerCase()

  const existingUser = normalizedEmail ? await findUserByEmail(normalizedEmail) : null
  const isVerified = Boolean(existingUser?._verified)

  const hasVerificationPayload = Boolean(normalizedEmail && token)

  return (
    <CreatorAuthShell
      intro={
        <div className="space-y-3">
          <p className="text-[13px] text-foreground/80">Validación de correo</p>
          <h1 className="text-2xl font-medium text-foreground">
            {isVerified
              ? 'Correo confirmado'
              : hasVerificationPayload
                ? 'Confirma tu correo'
                : 'No pudimos validar el enlace'}
          </h1>
          <p className="text-[13px] leading-6 text-foreground/80">
            {isVerified
              ? 'Tu correo ya había sido confirmado. Ya puedes iniciar sesión.'
              : hasVerificationPayload
                ? 'Estamos validando tu enlace de forma segura para evitar que scanners o previsualizadores consuman el token antes que tú.'
                : 'El enlace de verificación no es válido o está incompleto.'}
          </p>
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
      ) : normalizedEmail && token ? (
        <ConfirmVerificationForm email={normalizedEmail} token={token} />
      ) : (
        <Link
          className="inline-flex h-12 w-full items-center justify-center border border-border bg-background px-4 text-[13px] font-medium text-foreground"
          href="/creator/register"
        >
          Volver al registro
        </Link>
      )}
    </CreatorAuthShell>
  )
}
