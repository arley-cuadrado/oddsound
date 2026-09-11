import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { isGoogleConsumerOAuthConfigured } from '@/utilities/consumerAuth'
import { CreatorAuthShell } from '../../creator/auth-shell'
import { GoogleConsumerAuthButton } from '../auth/GoogleConsumerAuthButton'

export default async function ConsumerRegisterView() {
  await getMeUser({
    validUserRedirect: '/fan/account',
  }).catch(() => null)
  const googleOAuthConfigured = isGoogleConsumerOAuthConfigured()

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
            favorito, comprar y revisar tu tracking dentro de Oddsound.
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        {!googleOAuthConfigured ? (
          <p className="text-[13px] leading-6 text-foreground/75">
            El acceso con Google aún no está configurado en este entorno. Define
            `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` y, si aplica,
            `GOOGLE_OAUTH_REDIRECT_URI` antes de probar el registro de fan.
          </p>
        ) : null}
        <GoogleConsumerAuthButton
          disabled={!googleOAuthConfigured}
          label="Registrarme con Google"
        />
      </div>
    </CreatorAuthShell>
  )
}
