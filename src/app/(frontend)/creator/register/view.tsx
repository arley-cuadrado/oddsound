import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getMeUser } from '@/utilities/getMeUser'
import { isFanUser } from '@/utilities/isEditorialUser'
import { CreatorAuthShell } from '../auth-shell'
import { RegisterForm } from './register-form'

export default async function CreatorRegisterView() {
  const session = await getMeUser().catch(() => null)

  if (session?.user) {
    redirect(isFanUser(session.user) ? '/fan/account' : '/dashboard')
  }

  return (
    <CreatorAuthShell
      footer={
        <div className="space-y-3 text-center">
          <p>
            ¿Ya estás registrad@?{' '}
            <Link
              className="text-[13px] text-foreground underline underline-offset-2"
              href="/creator/login"
            >
              Inicia sesión
            </Link>
          </p>
          <p>
            <Link
              className="text-[13px] text-foreground underline underline-offset-2"
              href="/fan/login"
            >
              Solo quiero ser fan
            </Link>
          </p>
        </div>
      }
      intro={
        <p className="text-[13px] text-foreground/80">Bienvenid@, crea tu cuenta aquí.</p>
      }
    >
      <RegisterForm />
    </CreatorAuthShell>
  )
}
