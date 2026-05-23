import Link from 'next/link'

import config from '@payload-config'
import { getPayload } from 'payload'

import { VerificationResendForm } from '@/app/(frontend)/creator/verification-resend-form'

type Props = {
  searchParams: Promise<{
    email?: string
    token?: string
  }>
}

export default async function CreatorVerifyPage({ searchParams }: Props) {
  const payload = await getPayload({ config })
  const { email, token } = await searchParams

  let isVerified = false
  let message = 'El enlace no es válido o ya expiró.'

  if (token) {
    try {
      await payload.verifyEmail({
        collection: 'users',
        token,
      })

      isVerified = true
      message = 'Tu correo fue confirmado correctamente. Ya puedes iniciar sesión.'
    } catch (error) {
      message = error instanceof Error ? error.message : message
    }
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-[30rem] space-y-8">
        <div className="space-y-3">
          <p className="text-[13px] text-foreground/80">Validación de correo</p>
          <h1 className="text-2xl font-medium text-foreground">
            {isVerified ? 'Correo confirmado' : 'No pudimos validar el enlace'}
          </h1>
          <p className="text-[13px] leading-6 text-foreground/80">{message}</p>
        </div>

        {isVerified ? (
          <Link
            className="inline-flex h-12 w-full items-center justify-center bg-[#312e2e] px-4 text-[13px] font-medium text-white"
            href="/dashboard/login"
          >
            Ir a iniciar sesión
          </Link>
        ) : (
          <div className="space-y-4">
            {email ? <VerificationResendForm email={email} /> : null}
            <Link
              className="inline-flex h-12 w-full items-center justify-center border border-border bg-background px-4 text-[13px] font-medium text-foreground"
              href="/creator/register"
            >
              Volver al registro
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
