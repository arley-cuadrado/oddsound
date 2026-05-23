import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { CreatorAuthShell } from '../auth-shell'
import { CreatorResetPasswordForm } from './reset-password-form'

type Props = {
  searchParams: Promise<{
    token?: string
  }>
}

export default async function CreatorResetPasswordView({ searchParams }: Props) {
  await getMeUser({
    validUserRedirect: '/dashboard',
  }).catch(() => null)

  const { token } = await searchParams

  return (
    <CreatorAuthShell
      intro={
        <div className="space-y-2">
          <p className="text-[13px] text-foreground/80">Crea una nueva contraseña.</p>
          <p className="text-[13px] text-foreground/80">
            Usa una contraseña nueva para volver a entrar a tu cuenta de creador.
          </p>
        </div>
      }
    >
      {token ? (
        <CreatorResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            El enlace de recuperación no es válido o está incompleto.
          </p>
          <Link
            className="inline-flex h-12 w-full items-center justify-center bg-[#312e2e] px-4 text-[13px] font-medium text-white"
            href="/creator/forgot-password"
          >
            Solicitar un nuevo enlace
          </Link>
        </div>
      )}
    </CreatorAuthShell>
  )
}
