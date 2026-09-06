import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getMeUser } from '@/utilities/getMeUser'
import { isFanUser } from '@/utilities/isEditorialUser'
import { CreatorAuthShell } from '../auth-shell'
import { CreatorForgotPasswordForm } from './forgot-password-form'

export default async function CreatorForgotPasswordView() {
  const session = await getMeUser().catch(() => null)

  if (session?.user) {
    redirect(isFanUser(session.user) ? '/fan/account' : '/dashboard')
  }

  return (
    <CreatorAuthShell
      footer={
        <p>
          ¿Ya recuerdas tu contraseña?{' '}
          <Link
            className="text-[13px] text-foreground underline underline-offset-2"
            href="/dashboard/login"
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
