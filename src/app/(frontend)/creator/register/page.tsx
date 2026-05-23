import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { RegisterForm } from './register-form'

export default async function CreatorRegisterPage() {
  await getMeUser({
    validUserRedirect: '/dashboard',
  }).catch(() => null)

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-[30rem]">
        <div className="mb-8">
          <p className="text-[13px] text-foreground/80">
            Bienvenid@ al espacio de <strong>oddsound</strong>, crea tu cuenta aquí.
          </p>
        </div>

        <RegisterForm />

        <p className="mt-8 text-[13px] text-foreground/80">
          ¿Ya estás registrad@?{' '}
          <Link className="text-[13px] text-foreground underline underline-offset-2" href="/creator/login">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
