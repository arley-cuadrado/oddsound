import type { User } from '@/payload-types'

import { getServerSideURL } from '@/utilities/getURL'

export const VERIFICATION_RESEND_COOLDOWN_MS = 5 * 60 * 1000
export const CREATOR_RESET_PASSWORD_EXPIRATION_MS = 60 * 60 * 1000

type VerificationUser = Pick<User, 'email' | 'name'>

type EmailTemplateOptions = {
  actionLabel: string
  actionURL: string
  body: string
  fallbackPrefix: string
  heroPhotographerName: string
  heroPhotographerPhotoURL: string
  heroImageURL: string
  outlookHeroImageURL: string
  preheader: string
  recipientName?: null | string
  title: string
}

const SITE_URL = getServerSideURL()
const EMAIL_FOUNDER_AVATAR_URL = new URL('/home-images/arlo_cuadrado.png', SITE_URL).toString()
const EMAIL_FOUNDER_INSTAGRAM_URL = 'https://www.instagram.com/arlo_cuadrado/'
const EMAIL_PRIVACY_URL = new URL('/privacy-policy', SITE_URL).toString()
const EMAIL_TERMS_URL = new URL('/terms-and-conditions', SITE_URL).toString()
const EMAIL_SIGNATURE_HANDLE = '@arlo_cuadrado'
const EMAIL_SIGNATURE_ROLE = 'Founder / "Content Creator"'
const EMAIL_VERIFICATION_HERO_PHOTOGRAPHER_NAME = 'Nikolay Ekimov'
const EMAIL_VERIFICATION_HERO_PHOTOGRAPHER_PHOTO_URL = new URL(
  '/home-images/Nikolay_Ekimov.jpg',
  SITE_URL,
).toString()
const EMAIL_VERIFICATION_HERO_IMAGE_URL = new URL(
  '/home-images/header-image-1.jpg',
  SITE_URL,
).toString()
const EMAIL_VERIFICATION_OUTLOOK_HERO_IMAGE_URL = new URL(
  '/home-images/header-image-copy-1.jpg',
  SITE_URL,
).toString()
const EMAIL_RESET_HERO_PHOTOGRAPHER_NAME = 'Sami Aksu'
const EMAIL_RESET_HERO_PHOTOGRAPHER_PHOTO_URL = new URL(
  '/home-images/Sami_Aksu.jpg',
  SITE_URL,
).toString()
const EMAIL_RESET_HERO_IMAGE_URL = new URL('/home-images/header-image-2.jpg', SITE_URL).toString()
const EMAIL_RESET_OUTLOOK_HERO_IMAGE_URL = new URL(
  '/home-images/header-image-copy-2.jpg',
  SITE_URL,
).toString()

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getGreetingName(name?: null | string) {
  const trimmedName = name?.trim()

  return trimmedName ? escapeHtml(trimmedName) : 'desde oddsound'
}

function buildEmailTemplate({
  actionLabel,
  actionURL,
  body,
  fallbackPrefix,
  heroPhotographerName,
  heroPhotographerPhotoURL,
  heroImageURL,
  outlookHeroImageURL,
  preheader,
  recipientName,
  title,
}: EmailTemplateOptions) {
  const safeActionLabel = escapeHtml(actionLabel)
  const safeActionURL = escapeHtml(actionURL)
  const safeBody = escapeHtml(body)
  const safeFallbackPrefix = escapeHtml(fallbackPrefix)
  const safePreheader = escapeHtml(preheader)
  const safeRecipientName = getGreetingName(recipientName)
  const currentYear = new Date().getFullYear()

  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
    <title>${escapeHtml(title)}</title>
    <!--[if mso]>
      <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG />
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    <![endif]-->
    <style>
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background-color: #f3f3f3;
      }

      body,
      table,
      td,
      a {
        -ms-text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%;
      }

      table,
      td {
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
      }

      table {
        border-spacing: 0 !important;
        border-collapse: collapse !important;
      }

      img {
        border: 0;
        outline: none;
        text-decoration: none;
        -ms-interpolation-mode: bicubic;
        display: block;
      }

      a {
        text-decoration: none;
      }

      p {
        margin: 0;
      }

      .ExternalClass {
        width: 100%;
      }

      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height: 100%;
      }

      .apple-link a,
      .unstyle-auto-detected-links a,
      .aBn {
        color: inherit !important;
        text-decoration: none !important;
        font-size: inherit !important;
        font-family: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
      }

      u + #body a {
        color: inherit;
        text-decoration: none;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
      }

      @media screen and (max-width: 552px) {
        .container {
          width: 100% !important;
        }

        .mobile-shell {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }

        .hero-image {
          width: 100% !important;
          height: 250px !important;
          border-radius: 8px !important;
        }

        .content-pad {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }

        .headline {
          font-size: 24px !important;
          line-height: 32px !important;
        }

        .body-copy {
          font-size: 16px !important;
          line-height: 24px !important;
        }

        .footer-line {
          padding: 34px 16px 0 16px !important;
        }

        .footer-links {
          padding-top: 0 !important;
          text-align: right !important;
        }

        .footer-links a {
          display: block !important;
          font-size: 8px !important;
          line-height: 10px !important;
        }

        .footer-terms {
          margin-bottom: 5px !important;
        }

        .footer-profile {
          margin: 0 !important;
        }

        .footer-link-separator {
          display: none !important;
        }

        .fallback-url {
          font-size: 12px !important;
          line-height: 18px !important;
          word-break: break-all !important;
        }
      }
    </style>
  </head>
  <body id="body" style="margin: 0 !important; padding: 0 !important; background-color: #f3f3f3;">
    <div style="display: none; overflow: hidden; line-height: 1px; opacity: 0; max-height: 0; max-width: 0;">
      ${safePreheader}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f3f3;">
      <tr>
        <td align="center" class="mobile-shell" style="padding: 24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="container" style="width: 100%; max-width: 600px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
                  <tr>
                    <td style="padding: 24px 32px 0 32px;">
                      <!--[if gte mso 9]>
                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:536px;height:266px;">
                          <v:fill type="frame" src="${outlookHeroImageURL}" color="#d8d1c8" />
                          <v:textbox inset="0,0,0,0">
                            <div style="font-size:0;line-height:0;">&nbsp;</div>
                          </v:textbox>
                        </v:rect>
                      <![endif]-->
                      <!--[if !mso]><!-- -->
                      <table
                        role="presentation"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        background="${heroImageURL}"
                        class="hero-image"
                        style="width: 100%; max-width: 536px; height: 266px; background-image: url('${heroImageURL}'); background-size: cover; background-position: center center; background-repeat: no-repeat; border-radius: 4px;"
                      >
                        <tr>
                          <td align="center" style="padding: 70px 20px 0 20px;">
                            <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 29px; line-height: 30px; color: #ffffff; font-weight: 400; letter-spacing: -0.4px;">
                              <span style="font-weight: 900;">odd</span>sound
                            </p>
                            <p style="margin: 4px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 13px; color: #ffffff; font-weight: 100;">
                              Be heard. Stay odd.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td valign="bottom" align="right" style="padding: 0 20px 18px 20px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td valign="middle" style="padding-right: 8px;">
                                  <img
                                    src="${heroPhotographerPhotoURL}"
                                    alt="Foto del fundador de oddsound"
                                    width="16"
                                    height="16"
                                    style="width: 16px; height: 16px; border-radius: 26px; display: block;"
                                  />
                                </td>
                                <td valign="middle" style="font-family: Arial, Helvetica, sans-serif; text-align: left;">
                                  <p style="margin: 0; font-size: 6px; line-height: 10px; color: #484848;">Photo by</p>
                                  <p style="margin: 0; font-size: 8px; color: #606060;">${escapeHtml(heroPhotographerName)}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      <!--<![endif]-->
                    </td>
                  </tr>

                  <tr>
                    <td class="content-pad" style="padding: 66px 110px 0 110px; text-align: center;">
                      <p
                        class="headline"
                        style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 24px; line-height: 64px; color: #111111; font-weight: 400; letter-spacing: -0.5px;"
                      >
                        <span style="font-weight: 900;">Hola</span> ${safeRecipientName}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td class="content-pad" style="padding: 30px 40px 0 40px; text-align: center;">
                      <p
                        class="body-copy"
                        style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; line-height: 24px; color: #6f6f6f; font-weight: 400;"
                      >
                        ${safeBody}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td class="button-wrap" align="center" style="padding: 52px 40px 0 40px;">
                      <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeActionURL}" style="height:69px;v-text-anchor:middle;width:330px;" arcsize="24%" stroke="f" fillcolor="#e45c81">
                          <w:anchorlock />
                          <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:400;">
                            ${safeActionLabel}
                          </center>
                        </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-- -->
                      <a
                        href="${safeActionURL}"
                        target="_blank"
                        class="button"
                        style="display: inline-block; min-width: 30px; width: 50%; border-radius: 4px; background: linear-gradient(90deg, #d64983 0%, #eb6b7e 100%); font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 29px; color: #ffffff; font-weight: 400; text-align: center; padding: 8px 8px;"
                      >
                        ${safeActionLabel}
                      </a>
                      <!--<![endif]-->
                    </td>
                  </tr>

                  <tr>
                    <td class="content-pad" style="padding: 42px 32px 10px 32px; text-align: center;">
                      <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #111111; font-weight: 800;">
                        ${safeFallbackPrefix}
                      </p>
                      <p class="fallback-url" style="margin: 12px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 22px; color: #6f6f6f; font-weight: 400; word-break: break-word;">
                        <a href="${safeActionURL}" target="_blank" style="color: #6f6f6f; text-decoration: underline;">${safeActionURL}</a>
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 34px 32px 0 32px;" class="footer-line">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="border-top: 1px solid #e6e6e6; font-size: 1px; line-height: 1px;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 48px 32px 50px 32px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="footer-stack">
                        <tr>
                          <td valign="middle" style="width: 45%;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td>
                                  <a
                                    href="${EMAIL_FOUNDER_INSTAGRAM_URL}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style="display: inline-block; color: inherit; text-decoration: none;"
                                  >
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                      <tr>
                                        <td valign="middle" style="padding-right: 12px;">
                                          <img
                                            src="${EMAIL_FOUNDER_AVATAR_URL}"
                                            width="32"
                                            height="32"
                                            alt="${EMAIL_SIGNATURE_HANDLE}"
                                            style="width: 32px; height: 32px; border-radius: 16px; display: block;"
                                          />
                                        </td>
                                        <td valign="middle" style="font-family: Arial, Helvetica, sans-serif;">
                                          <p style="margin: 0; font-size: 12px; line-height: 20px; color: #d74a82; font-weight: 800;">${EMAIL_SIGNATURE_HANDLE}</p>
                                          <p style="margin: 0; font-size: 12px; line-height: 19px; color: #6f6f6f; font-weight: 400; white-space: nowrap;">${EMAIL_SIGNATURE_ROLE}</p>
                                        </td>
                                      </tr>
                                    </table>
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td valign="middle" align="right" class="footer-links" style="width: 55%; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 20px; color: #111111;">
                            <a class="footer-terms" href="${EMAIL_TERMS_URL}" target="_blank" style="color: #111111; text-decoration: underline;">Términos y condiciones</a>
                            <span class="footer-link-separator" style="color: #c7c7c7; padding: 0 10px;">|</span>
                            <a href="${EMAIL_PRIVACY_URL}" target="_blank" style="color: #111111; text-decoration: underline;">Política de privacidad</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" valign="middle" style="height: 40px; padding: 0 32px; background-color: #ececec; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 10px; color: #6f6f6f; text-align: center; vertical-align: middle;">
                      oddsound | ${currentYear}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export const getVerificationCooldownMessage = (msRemaining: number) => {
  const minutes = Math.max(1, Math.ceil(msRemaining / 60000))

  return `Espera ${minutes} minuto${minutes === 1 ? '' : 's'} antes de pedir otro enlace.`
}

export const getCreatorVerificationURL = ({ email, token }: { email: string; token: string }) => {
  const url = new URL('/creator/verify', SITE_URL)

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

  return buildEmailTemplate({
    actionLabel: 'Confirmar correo',
    actionURL: verificationURL,
    body: 'Ya casi activas tu cuenta en oddsound. Solo confirma tu correo para poder entrar. Una vez lo hagas podrás acceder a tu panel de usuario y comenzar a crear tus lanzamientos y publicaciones.',
    fallbackPrefix: 'PD: Si el botón no abre, copia y pega este enlace en tu navegador:',
    heroPhotographerName: EMAIL_VERIFICATION_HERO_PHOTOGRAPHER_NAME,
    heroPhotographerPhotoURL: EMAIL_VERIFICATION_HERO_PHOTOGRAPHER_PHOTO_URL,
    heroImageURL: EMAIL_VERIFICATION_HERO_IMAGE_URL,
    outlookHeroImageURL: EMAIL_VERIFICATION_OUTLOOK_HERO_IMAGE_URL,
    preheader: 'Confirma tu correo para activar tu cuenta en oddsound y comenzar a publicar.',
    recipientName: user.name,
    title: 'Confirma tu correo en oddsound',
  })
}

export const generateCreatorVerificationEmailSubject = () => 'Confirma tu correo en oddsound'

export const getCreatorResetPasswordURL = (token: string) => {
  const url = new URL('/creator/reset-password', SITE_URL)

  url.searchParams.set('token', token)

  return url.toString()
}

export const generateCreatorResetPasswordEmailHTML = ({
  token,
  user,
}: {
  token: string
  user: VerificationUser
}) => {
  const resetURL = getCreatorResetPasswordURL(token)

  return buildEmailTemplate({
    actionLabel: 'Crear nueva contraseña',
    actionURL: resetURL,
    body: 'Recibimos una solicitud para cambiar la contraseña de tu cuenta en oddsound. Si fuiste tú, usa el botón para crear una nueva contraseña y volver a entrar.',
    fallbackPrefix: 'Si el botón no abre, copia y pega este enlace en tu navegador:',
    heroPhotographerName: EMAIL_RESET_HERO_PHOTOGRAPHER_NAME,
    heroPhotographerPhotoURL: EMAIL_RESET_HERO_PHOTOGRAPHER_PHOTO_URL,
    heroImageURL: EMAIL_RESET_HERO_IMAGE_URL,
    outlookHeroImageURL: EMAIL_RESET_OUTLOOK_HERO_IMAGE_URL,
    preheader: 'Crea una nueva contraseña para volver a entrar a tu cuenta de oddsound.',
    recipientName: user.name,
    title: 'Restablece tu contraseña en oddsound',
  })
}

export const generateCreatorResetPasswordEmailSubject = () => 'Restablece tu contraseña en oddsound'
