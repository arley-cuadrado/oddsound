import Link from 'next/link'

import { isGoogleConsumerOAuthConfigured } from '@/utilities/consumerAuth'
import { getMeUser } from '@/utilities/getMeUser'
import { CreatorAuthShell } from '../../creator/auth-shell'
import { GoogleConsumerAuthButton } from '../auth/GoogleConsumerAuthButton'

type Props = {
  searchParams: Promise<{
    auth?: string
    next?: string
  }>
}

function resolveAuthMessage(auth?: string) {
  switch (auth) {
    case 'email-conflict':
      return 'Este correo ya está asociado a otra cuenta dentro de Oddsound.'
    case 'google-failed':
      return 'No fue posible completar el acceso con Google.'
    case 'invalid-state':
      return 'La sesión de acceso expiró. Intenta nuevamente.'
    case 'missing-config':
      return 'El acceso con Google aún no está configurado en este entorno.'
    case 'profile-missing':
      return 'No fue posible preparar tu perfil de fan. Intenta iniciar sesión nuevamente.'
    default:
      return null
  }
}

export default async function ConsumerLoginView({ searchParams }: Props) {
  await getMeUser({
    validUserRedirect: '/fan/account',
  }).catch(() => null)

  const { auth, next } = await searchParams
  const authMessage = resolveAuthMessage(auth)
  const googleOAuthConfigured = isGoogleConsumerOAuthConfigured()
  const googleHref = next
    ? `/consumer-api/auth/google/start?next=${encodeURIComponent(next)}`
    : '/consumer-api/auth/google/start'

  return (
    <CreatorAuthShell
      footer={
        <div className="space-y-3 text-center">
          <p>
            ¿Necesitas una cuenta de artista?{' '}
            <Link
              className="text-[13px] text-foreground underline underline-offset-2"
              href="/creator/register"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
      }
      intro={
        <div className="space-y-3">
          <h1 className="text-2xl font-medium text-foreground">Inicia sesión como fan</h1>
          <p className="text-[13px] leading-6 text-foreground/80">
            Crea tu acceso con Google para comentar y compartir a tu artista independiente
            favorito.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        {authMessage ? (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {authMessage}
          </p>
        ) : null}
        {!googleOAuthConfigured ? (
          <p className="text-[13px] leading-6 text-foreground/75">
            Este entorno aún no tiene configurado el acceso con Google para fans. Completa
            las variables `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` y
            `GOOGLE_OAUTH_REDIRECT_URI` para habilitarlo.
          </p>
        ) : null}
        <GoogleConsumerAuthButton
          disabled={!googleOAuthConfigured}
          href={googleHref}
          label="Usa tu cuenta de Google"
        />
      </div>
    </CreatorAuthShell>
  )
}
