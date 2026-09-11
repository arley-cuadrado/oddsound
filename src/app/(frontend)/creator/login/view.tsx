import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getMeUser } from '@/utilities/getMeUser'
import { isFanUser } from '@/utilities/isEditorialUser'
import { CreatorAuthShell } from '../auth-shell'
import { CreatorLoginForm } from './login-form'

export default async function CreatorLoginView() {
  const session = await getMeUser().catch(() => null)

  if (session?.user) {
    redirect(isFanUser(session.user) ? '/fan/account' : '/dashboard')
  }

  return (
    <CreatorAuthShell
      footer={
        <div className="flex flex-col items-center space-y-3 text-center">
          <Link
            className="text-[13px] text-foreground underline underline-offset-2"
            href="/creator/register"
          >
            Regístrate como artista
          </Link>
          <Link
            className="text-[13px] text-foreground underline underline-offset-2"
            href="/fan/login"
          >
            Inicia sesión como fan
          </Link>
        </div>
      }
      intro={<p className="text-[13px] text-foreground/80">Bienvenid@, inicia sesión aquí.</p>}
    >
      <CreatorLoginForm />
    </CreatorAuthShell>
  )
}
