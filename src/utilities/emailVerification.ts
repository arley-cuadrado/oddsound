import type { User } from '@/payload-types'

import { getServerSideURL } from '@/utilities/getURL'

export const VERIFICATION_RESEND_COOLDOWN_MS = 5 * 60 * 1000

type VerificationUser = Pick<User, 'email' | 'name'>

export const getVerificationCooldownMessage = (msRemaining: number) => {
  const minutes = Math.max(1, Math.ceil(msRemaining / 60000))

  return `Espera ${minutes} minuto${minutes === 1 ? '' : 's'} antes de pedir otro enlace.`
}

export const getCreatorVerificationURL = ({
  email,
  token,
}: {
  email: string
  token: string
}) => {
  const url = new URL('/creator/verify', getServerSideURL())

  url.searchParams.set('email', email)
  url.searchParams.set('token', token)

  return url.toString()
}

export const generateCreatorVerificationEmailHTML = ({
  token,
  user,
}: {
  token: string
  user: VerificationUser
}) => {
  const verificationURL = getCreatorVerificationURL({
    email: user.email,
    token,
  })

  return `
    <div style="background:#f7f4ef;padding:32px 20px;font-family:Arial,sans-serif;color:#171717;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5ddd2;padding:32px;">
        <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">Hola${user.name ? ` ${user.name}` : ''},</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">
          Ya casi activas tu cuenta en <strong>oddsound</strong>. Solo confirma tu correo para poder entrar.
        </p>
        <p style="margin:24px 0;">
          <a
            href="${verificationURL}"
            style="display:inline-block;background:#171717;color:#ffffff;padding:14px 22px;text-decoration:none;font-size:14px;"
          >
            Confirmar correo
          </a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.7;">
          Si el botón no abre, copia y pega este enlace en tu navegador:
        </p>
        <p style="margin:0;font-size:13px;line-height:1.7;word-break:break-word;">
          <a href="${verificationURL}" style="color:#171717;">${verificationURL}</a>
        </p>
      </div>
    </div>
  `
}

export const generateCreatorVerificationEmailSubject = () => 'Confirma tu correo en oddsound'
