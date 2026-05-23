import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { CreatorAuthShell } from '../auth-shell'
import { CreatorLoginForm } from './login-form'

export default async function CreatorLoginView() {
  await getMeUser({
    validUserRedirect: '/dashboard',
  }).catch(() => null)

  return (
    <CreatorAuthShell
      footer={
        <p>
          ¿Necesitas primero una cuenta de creador?{' '}
          <Link
            className="text-[13px] text-foreground underline underline-offset-2"
            href="/creator/register"
          >
            Regístrate aquí
          </Link>
        </p>
      }
      intro={<p className="text-[13px] text-foreground/80">Bienvenid@ a tu espacio, inicia sesión aquí.</p>}
    >
      <CreatorLoginForm />
    </CreatorAuthShell>
  )
}
