import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

import { ensureCreatorProfile } from '@/utilities/creatorProfiles'

export type AccountType = 'artist' | 'band'
export type LegacyAccountType = AccountType | 'label'

export type CreatorAuthStatus =
  | 'logged_in'
  | 'not_found'
  | 'password_reset_completed'
  | 'password_reset_requested'
  | 'pending_verification'
  | 'verification_email_resent'

export type CreatorAuthResult = {
  email?: string
  message?: string
  ok: boolean
  status?: CreatorAuthStatus
}

export type VerificationUser = {
  name?: null | string
  role?: null | string
  _verificationToken?: null | string
  _verified?: boolean | null
  createdAt?: null | string
  email: string
  id: string
  updatedAt?: null | string
}

export const CREATOR_LEGAL_VERSION = '2026-05-14'
export const CREATOR_VERIFICATION_ERROR_MESSAGE = 'Debes confirmar tu correo antes de iniciar sesión.'

export async function findUserByEmail(
  email: string,
  payloadArg?: Awaited<ReturnType<typeof getPayload>>,
): Promise<null | VerificationUser> {
  const payload = payloadArg || (await getPayload({ config }))
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

export async function registerCreatorAccount(input: {
  acceptedLegal: boolean
  accountType: AccountType
  country: string
  email: string
  genre: string
  name: string
  password: string
}): Promise<CreatorAuthResult> {
  try {
    const payload = await getPayload({ config })
    const country = input.country.trim()
    const email = input.email.trim().toLowerCase()
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

    const existingUser = await findUserByEmail(email, payload)

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
        legalAcceptedVersion: CREATOR_LEGAL_VERSION,
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

export async function loginCreatorAccount(input: {
  email: string
  password: string
}): Promise<
  CreatorAuthResult & {
    token?: string
    user?: {
      accountType?: null | LegacyAccountType
      email: string
      id: string
      name?: null | string
      profile?: null | string | { id?: null | string }
      role?: null | string
    }
  }
> {
  try {
    const email = input.email.trim().toLowerCase()
    const payload = await getPayload({ config })
    const existingUser = await findUserByEmail(email, payload)

    if (!existingUser) {
      return {
        message: 'No encontramos una cuenta con ese correo. Regístrate para continuar.',
        ok: false,
      }
    }

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

    return {
      ok: true,
      status: 'logged_in',
      token: result.token,
      user: {
        accountType: result.user.accountType,
        email: result.user.email,
        id: result.user.id,
        name: result.user.name,
        profile: result.user.profile,
        role: result.user.role,
      },
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'UnverifiedEmail') {
      return {
        email: input.email.trim().toLowerCase(),
        message: CREATOR_VERIFICATION_ERROR_MESSAGE,
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
