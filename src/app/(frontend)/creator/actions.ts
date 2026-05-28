'use server'

import config from '@payload-config'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

import {
  VERIFICATION_RESEND_COOLDOWN_MS,
  generateCreatorVerificationEmailHTML,
  generateCreatorVerificationEmailSubject,
  getVerificationCooldownMessage,
} from '@/utilities/emailVerification'
import {
  getExpiredPayloadTokenCookieOptions,
  getPayloadTokenCookieOptions,
} from '@/utilities/payloadAuthCookie'
import {
  AccountType,
  CreatorAuthResult as ActionResult,
  findUserByEmail,
  loginCreatorAccount,
  registerCreatorAccount,
} from '@/utilities/creatorAuth'

type ActionStatus =
  | 'logged_in'
  | 'not_found'
  | 'password_reset_completed'
  | 'password_reset_requested'
  | 'pending_verification'
  | 'verification_email_resent'

type ExtendedActionResult = ActionResult & {
  status?:
    | ActionStatus
}

function getCooldownRemaining(isoDate?: null | string) {
  if (!isoDate) return 0

  const sentAt = new Date(isoDate).getTime()

  if (Number.isNaN(sentAt)) return 0

  return Math.max(0, VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - sentAt))
}

export async function registerCreator(input: {
  acceptedLegal: boolean
  accountType: AccountType
  country: string
  email: string
  genre: string
  name: string
  password: string
}): Promise<ExtendedActionResult> {
  return registerCreatorAccount(input)
}

export async function loginCreator(input: {
  email: string
  password: string
}): Promise<ExtendedActionResult> {
  const result = await loginCreatorAccount(input)

  if (!result.ok || !result.token) {
    return result
  }

  const cookieStore = await cookies()

  cookieStore.set('payload-token', result.token, await getPayloadTokenCookieOptions())

  return { ok: true, status: 'logged_in' }
}

export async function resendVerificationEmail(input: {
  email: string
}): Promise<ActionResult> {
  const email = input.email.trim().toLowerCase()

  if (!email) {
    return {
      message: 'Necesitamos un correo electrónico para reenviar el enlace.',
      ok: false,
    }
  }

  try {
    const payload = await getPayload({ config })
    const user = await findUserByEmail(email, payload)

    if (!user) {
      return {
        message: 'No encontramos una cuenta pendiente con ese correo.',
        ok: false,
      }
    }

    if (user._verified) {
      return {
        message: 'Esta cuenta ya está verificada. Ya puedes iniciar sesión.',
        ok: false,
      }
    }

    const cooldownRemaining = getCooldownRemaining(user.updatedAt || user.createdAt)

    if (cooldownRemaining > 0) {
      return {
        email,
        message: getVerificationCooldownMessage(cooldownRemaining),
        ok: false,
        status: 'pending_verification',
      }
    }

    const payloadReq = await createLocalReq({}, payload)
    const token = crypto.randomBytes(20).toString('hex')

    const updatedUser = await payload.update({
      id: user.id,
      collection: 'users',
      data: {
        _verificationToken: token,
        _verified: false,
      } as never,
      depth: 0,
      overrideAccess: true,
      req: payloadReq,
      showHiddenFields: true,
    })

    await payload.sendEmail({
      html: generateCreatorVerificationEmailHTML({
        token,
        user: {
          email: updatedUser.email,
          name: updatedUser.name || null,
        },
      }),
      subject: generateCreatorVerificationEmailSubject(),
      to: email,
    })

    return {
      email,
      message: 'Te enviamos un nuevo enlace de verificación.',
      ok: true,
      status: 'verification_email_resent',
    }
  } catch (error) {
    return {
      email,
      message: error instanceof Error ? error.message : 'No fue posible reenviar el correo.',
      ok: false,
    }
  }
}

export async function requestCreatorPasswordReset(input: {
  email: string
}): Promise<ActionResult> {
  const email = input.email.trim().toLowerCase()

  if (!email) {
    return {
      message: 'Ingresa el correo electrónico asociado a tu cuenta.',
      ok: false,
    }
  }

  try {
    const payload = await getPayload({ config })
    const user = await findUserByEmail(email, payload)

    if (!user || user.role !== 'creator') {
      return {
        message: 'No encontramos una cuenta de creador con ese correo. Regístrate para continuar.',
        ok: false,
        status: 'not_found',
      }
    }

    if (user._verified === false) {
      return {
        email,
        message:
          'Primero debes confirmar tu correo. Revisa tu bandeja o solicita un nuevo enlace de verificación.',
        ok: false,
        status: 'pending_verification',
      }
    }

    await payload.forgotPassword({
      collection: 'users',
      data: {
        email,
      },
      overrideAccess: true,
    })

    return {
      email,
      message: 'Te enviamos un enlace para crear una nueva contraseña.',
      ok: true,
      status: 'password_reset_requested',
    }
  } catch (error) {
    return {
      email,
      message:
        error instanceof Error
          ? error.message
          : 'No fue posible enviar el enlace para restablecer la contraseña.',
      ok: false,
    }
  }
}

export async function resetCreatorPassword(input: {
  password: string
  token: string
}): Promise<ActionResult> {
  const password = input.password.trim()
  const token = input.token.trim()

  if (!token) {
    return {
      message: 'El enlace de recuperación no es válido o ya expiró.',
      ok: false,
    }
  }

  if (!password) {
    return {
      message: 'Ingresa una nueva contraseña.',
      ok: false,
    }
  }

  try {
    const payload = await getPayload({ config })

    await payload.resetPassword({
      collection: 'users',
      data: {
        password,
        token,
      },
      overrideAccess: true,
    })

    return {
      message: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.',
      ok: true,
      status: 'password_reset_completed',
    }
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : 'No fue posible actualizar la contraseña con este enlace.',
      ok: false,
    }
  }
}

export async function logoutCreator(): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set('payload-token', '', await getExpiredPayloadTokenCookieOptions())
}
