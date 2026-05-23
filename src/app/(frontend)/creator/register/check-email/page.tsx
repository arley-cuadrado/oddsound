import Link from 'next/link'

import { VerificationResendForm } from '@/app/(frontend)/creator/verification-resend-form'

type Props = {
  searchParams: Promise<{
    email?: string
  }>
}

export default async function CreatorRegisterCheckEmailPage({ searchParams }: Props) {
  const { email } = await searchParams

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-[30rem] space-y-8">
        <div className="space-y-3">
          <p className="text-[13px] text-foreground/80">Tu cuenta ya casi está lista.</p>
          <h1 className="text-2xl font-medium text-foreground">Revisa tu correo para activarla</h1>
          <p className="text-[13px] leading-6 text-foreground/80">
            Te enviamos un enlace de verificación a{' '}
            <strong>{email || 'tu correo electrónico'}</strong>. Cuando lo abras, tu cuenta quedará
            lista para iniciar sesión.
          </p>
        </div>

        {email ? <VerificationResendForm email={email} /> : null}

        <div className="space-y-3 text-[13px] text-foreground/80">
          <p>Si no lo ves, revisa spam o promociones. Si aún no llega, puedes reenviarlo.</p>
          <p>
            ¿Ya verificaste tu correo?{' '}
            <Link className="text-foreground underline underline-offset-2" href="/dashboard/login">
              Inicia sesión
            </Link>
          </p>
          <p>
            ¿Necesitas cambiar el correo?{' '}
            <Link className="text-foreground underline underline-offset-2" href="/creator/register">
              Vuelve al registro
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
