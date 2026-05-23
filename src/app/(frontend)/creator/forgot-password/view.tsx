import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { CreatorAuthShell } from '../auth-shell'
import { CreatorForgotPasswordForm } from './forgot-password-form'

export default async function CreatorForgotPasswordView() {
  await getMeUser({
    validUserRedirect: '/dashboard',
  }).catch(() => null)

  return (
    <CreatorAuthShell
      footer={
        <p>
          ¿Ya recuerdas tu contraseña?{' '}
          <Link
            className="text-[13px] text-foreground underline underline-offset-2"
            href="/creator/login"
          >
            Vuelve a iniciar sesión
          </Link>
        </p>
      }
    >
      <CreatorForgotPasswordForm />
    </CreatorAuthShell>
  )
}
