import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { CreatorForgotPasswordForm } from './forgot-password-form'

export default async function CreatorForgotPasswordPage() {
  await getMeUser({
    validUserRedirect: '/dashboard',
  }).catch(() => null)

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[32rem] flex-col justify-center">
        <div className="mb-12 text-center">
          <Link className="inline-flex text-5xl font-light tracking-tight text-foreground" href="/">
            <span className="font-black title">odd</span>sound
          </Link>
        </div>

        <div className="mb-8 space-y-2">
          <p className="text-[13px] text-foreground/80">Recupera el acceso a tu cuenta.</p>
          <p className="text-[13px] text-foreground/80">
            Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
          </p>
        </div>

        <CreatorForgotPasswordForm />

        <p className="mt-8 text-[13px] text-foreground/80">
          ¿Ya recuerdas tu contraseña?{' '}
          <Link
            className="text-[13px] text-foreground underline underline-offset-2"
            href="/creator/login"
          >
            Vuelve a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
