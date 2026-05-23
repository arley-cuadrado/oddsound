import Link from 'next/link'

import AdminLogo from '@/components/AdminLogo'
import { getMeUser } from '@/utilities/getMeUser'
import { CreatorLoginForm } from './login-form'

export default async function CreatorLoginPage() {
  await getMeUser({
    validUserRedirect: '/dashboard',
  }).catch(() => null)

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[32rem] flex-col justify-center">
        <div className="mb-12 text-center">
          <div className="inline-flex">
            <AdminLogo />
          </div>
        </div>

        <div className="mb-8">
          <p className="text-[13px] text-foreground/80">
            Bienvenid@ a tu espacio, inicia sesión aquí.
          </p>
        </div>

        <CreatorLoginForm />

        <p className="mt-8 text-[13px] text-foreground/80">
          ¿Necesitas primero una cuenta de creador?{' '}
          <Link
            className="text-[13px] text-foreground underline underline-offset-2"
            href="/creator/register"
          >
            Regístrate aquí
          </Link>
        </p>
      </div>
    </main>
  )
}
