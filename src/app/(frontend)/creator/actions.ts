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
import { ensureCreatorProfile } from '@/utilities/creatorProfiles'

type AccountType = 'artist' | 'band' | 'label'
const LEGAL_VERSION = '2026-05-14'
const VERIFICATION_ERROR_MESSAGE = 'Debes confirmar tu correo antes de iniciar sesión.'

type ActionResult = {
  email?: string
  message?: string
  ok: boolean
  status?:
    | 'logged_in'
    | 'not_found'
    | 'password_reset_completed'
    | 'password_reset_requested'
    | 'pending_verification'
    | 'verification_email_resent'
}

type VerificationUser = {
  name?: null | string
  role?: null | string
  _verificationToken?: null | string
  _verified?: boolean | null
  createdAt?: null | string
  email: string
  id: string
  updatedAt?: null | string
}

async function findUserByEmail(email: string): Promise<null | VerificationUser> {
  const payload = await getPayload({ config })
  const existingUser = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    showHiddenFields: true,
    where: {
      email: {
        equals: email,
      },
    },
  })

  return (existingUser.docs[0] as VerificationUser | undefined) || null
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
}): Promise<ActionResult> {
  try {
    const payload = await getPayload({ config })
    const country = input.country.trim()
    const email = input.email.trim().toLowerCase()
    // Persist genre on the creator profile so frontend search can match by musical genre.
    const genre = input.genre.trim()
    const name = input.name.trim()

    if (!input.acceptedLegal) {
      return {
        message: 'Debes aceptar los Términos y condiciones y la Política de privacidad.',
        ok: false,
      }
    }

    if (!country || !email || !genre || !name || !input.password) {
      return {
        message: 'Nombre, país, género musical, correo electrónico y contraseña son obligatorios.',
        ok: false,
      }
    }

    const existingUser = await findUserByEmail(email)

    if (existingUser && existingUser._verified !== false) {
      return {
        message: 'Este usuario ya está registrado.',
        ok: false,
      }
    }

    if (existingUser) {
      return {
        email,
        message: 'Esta cuenta ya existe y está pendiente de verificación.',
        ok: true,
        status: 'pending_verification',
      }
    }

    const createdUser = await payload.create({
      collection: 'users',
      data: {
        accountType: input.accountType,
        email,
        legalAccepted: true,
        legalAcceptedAt: new Date().toISOString(),
        legalAcceptedVersion: LEGAL_VERSION,
        name,
        password: input.password,
        role: 'creator',
      },
      draft: false,
      overrideAccess: true,
    })

    const profileId =
      typeof createdUser.profile === 'string' ? createdUser.profile : createdUser.profile?.id

    if (profileId) {
      await payload.update({
        id: profileId,
        collection: 'profiles',
        data: {
          genre,
          location: country,
        },
        overrideAccess: true,
      })
    }

    return {
      email,
      message: 'Tu cuenta fue creada. Revisa tu correo para activarla.',
      ok: true,
      status: 'pending_verification',
    }
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'No fue posible crear tu cuenta.',
      ok: false,
    }
  }
}

export async function loginCreator(input: {
  email: string
  password: string
}): Promise<ActionResult> {
  try {
    const email = input.email.trim().toLowerCase()
    const existingUser = await findUserByEmail(email)

    if (!existingUser) {
      return {
        message: 'No encontramos una cuenta con ese correo. Regístrate para continuar.',
        ok: false,
      }
    }

    const payload = await getPayload({ config })
    const payloadReq = await createLocalReq({}, payload)

    const result = await payload.login({
      collection: 'users',
      data: {
        email,
        password: input.password,
      },
      req: payloadReq,
    })

    if (!result.token || !result.user) {
      return {
        message: 'Unable to log in.',
        ok: false,
      }
    }

    await ensureCreatorProfile({
      payload,
      req: payloadReq,
      user: {
        accountType: result.user.accountType,
        email: result.user.email,
        id: result.user.id,
        name: result.user.name,
        profile: result.user.profile,
        role: result.user.role,
      },
    })

    const cookieStore = await cookies()

    cookieStore.set('payload-token', result.token, await getPayloadTokenCookieOptions())

    return { ok: true, status: 'logged_in' }
  } catch (error) {
    if (error instanceof Error && error.name === 'UnverifiedEmail') {
      return {
        email: input.email.trim().toLowerCase(),
        message: VERIFICATION_ERROR_MESSAGE,
        ok: false,
        status: 'pending_verification',
      }
    }

    return {
      message: error instanceof Error ? error.message : 'Unable to log in.',
      ok: false,
    }
  }
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
    const user = await findUserByEmail(email)

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
    const user = await findUserByEmail(email)

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
