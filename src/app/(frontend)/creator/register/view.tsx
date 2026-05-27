import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { CreatorAuthShell } from '../auth-shell'
import { RegisterForm } from './register-form'

export default async function CreatorRegisterView() {
  await getMeUser({
    validUserRedirect: '/dashboard',
  }).catch(() => null)

  return (
    <CreatorAuthShell
      footer={
        <p>
          ¿Ya estás registrad@?{' '}
          <Link
            className="text-[13px] text-foreground underline underline-offset-2"
            href="/creator/login"
          >
            Inicia sesión
          </Link>
        </p>
      }
      intro={
        <p className="text-[13px] text-foreground/80">Bienvenid@, crea tu cuenta aquí.</p>
      }
    >
      <RegisterForm />
    </CreatorAuthShell>
  )
}
