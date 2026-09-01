import crypto from 'crypto'
import { createLocalReq, getPayload } from 'payload'

import { getTemporaryLoginLockMessage } from '@/utilities/authLocking'
import { ensureCreatorProfile } from '@/utilities/creatorProfiles'
import {
  generateCreatorVerificationEmailHTML,
  generateCreatorVerificationEmailSubject,
  generateEditorVerificationEmailHTML,
  generateEditorVerificationEmailSubject,
} from '@/utilities/emailVerification'
import { hasEditorialIdentity } from '@/utilities/isEditorialUser'

export type AccountType = 'artist' | 'band'
export type LegacyAccountType = AccountType | 'label'

export type CreatorAuthStatus =
  | 'logged_in'
  | 'not_found'
  | 'password_reset_completed'
  | 'password_reset_requested'
  | 'pending_verification'
  | 'verification_already_completed'
  | 'verification_completed'
  | 'verification_email_resent'
  | 'verification_token_invalid'

export type CreatorAuthResult = {
  email?: string
  message?: string
  ok: boolean
  status?: CreatorAuthStatus
}

export type VerificationUser = {
  authProvider?: null | string
  editorAccess?: boolean | null
  name?: null | string
  role?: null | string
  userType?: null | string
  username?: null | string
  _verificationToken?: null | string
  _verified?: boolean | null
  createdAt?: null | string
  email: string
  id: string
  updatedAt?: null | string
}

type RequestHeadersLike = Headers | Record<string, string> | Record<string, string | undefined>
export type VerificationRequestLike = Request | { headers?: RequestHeadersLike }

export const CREATOR_LEGAL_VERSION = '2026-05-14'
export const CREATOR_VERIFICATION_ERROR_MESSAGE = 'Debes confirmar tu correo antes de iniciar sesión.'
export const CROSS_ACCOUNT_EMAIL_CONFLICT_MESSAGE =
  'Este correo ya está asociado a una cuenta de otro tipo dentro de Oddsound.'

async function getPayloadConfig() {
  const { default: config } = await import('@payload-config')

  return config
}

function isConsumerIdentity(user?: null | Pick<VerificationUser, 'authProvider' | 'userType'>) {
  return user?.userType === 'consumer' || user?.userType === 'fan' || user?.authProvider === 'google'
}

function buildUsernameSeed({ email, name }: { email: string; name: string }) {
  const normalizedName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (normalizedName) return normalizedName

  return (email.split('@')[0] || 'creator')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeRequestHeaders(input?: VerificationRequestLike): Headers {
  if (!input) return new Headers()

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return new Headers(input.headers)
  }

  if (input.headers instanceof Headers) {
    return new Headers(input.headers)
  }

  const headers = new Headers()

  for (const [key, value] of Object.entries(input.headers || {})) {
    if (typeof value === 'string' && value) {
      headers.set(key, value)
    }
  }

  return headers
}

export async function createPayloadReqWithHeaders(
  input: VerificationRequestLike | undefined,
  payload: Awaited<ReturnType<typeof getPayload>>,
) {
  const payloadReq = await createLocalReq({}, payload)

  ;(payloadReq as typeof payloadReq & { headers: Headers }).headers = normalizeRequestHeaders(input)

  return payloadReq
}

async function issueVerificationEmail(args: {
  payload: Awaited<ReturnType<typeof getPayload>>
  req?: VerificationRequestLike
  user: VerificationUser
}) {
  const { payload, req, user } = args
  const payloadReq = await createPayloadReqWithHeaders(req, payload)
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
    html: hasEditorialIdentity(updatedUser)
      ? generateEditorVerificationEmailHTML({
          req,
          token,
          user: {
            editorAccess: updatedUser.editorAccess,
            email: updatedUser.email || user.email,
            name: updatedUser.name || updatedUser.email || user.email,
            userType: updatedUser.userType,
          },
        })
      : generateCreatorVerificationEmailHTML({
          req,
          token,
          user: {
            editorAccess: updatedUser.editorAccess,
            email: updatedUser.email || user.email,
            name: updatedUser.name || updatedUser.email || user.email,
            userType: updatedUser.userType,
          },
        }),
    subject: hasEditorialIdentity(updatedUser)
      ? generateEditorVerificationEmailSubject()
      : generateCreatorVerificationEmailSubject(),
    to: user.email,
  })
}

async function sendExistingVerificationEmail(args: {
  payload: Awaited<ReturnType<typeof getPayload>>
  req?: VerificationRequestLike
  token: string
  user: VerificationUser
}) {
  const { payload, req, token, user } = args
  const userType: 'artist' | 'band' | 'creator' | 'editor' | 'fan' | null =
    user.userType === 'creator' ||
    user.userType === 'fan' ||
    user.userType === 'editor' ||
    user.userType === 'artist' ||
    user.userType === 'band'
      ? user.userType
      : null
  const verificationEmailUser = {
    editorAccess: user.editorAccess,
    email: user.email,
    name: user.name || user.email,
    userType,
  }

  await payload.sendEmail({
    html: hasEditorialIdentity(user)
      ? generateEditorVerificationEmailHTML({
          req,
          token,
          user: verificationEmailUser,
        })
      : generateCreatorVerificationEmailHTML({
          req,
          token,
          user: verificationEmailUser,
        }),
    subject: hasEditorialIdentity(user)
      ? generateEditorVerificationEmailSubject()
      : generateCreatorVerificationEmailSubject(),
    to: user.email,
  })
}

export async function findUserByEmail(
  email: string,
  payloadArg?: Awaited<ReturnType<typeof getPayload>>,
): Promise<null | VerificationUser> {
  const payload = payloadArg || (await getPayload({ config: await getPayloadConfig() }))
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

async function findUserByEmailAndVerificationToken(args: {
  email: string
  payload: Awaited<ReturnType<typeof getPayload>>
  token: string
}): Promise<null | VerificationUser> {
  const result = await args.payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    showHiddenFields: true,
    where: {
      and: [
        {
          email: {
            equals: args.email,
          },
        },
        {
          _verificationToken: {
            equals: args.token,
          },
        },
      ],
    },
  })

  return (result.docs[0] as VerificationUser | undefined) || null
}

export async function confirmCreatorVerification(input: {
  email?: string
  token?: string
}): Promise<CreatorAuthResult> {
  const email = input.email?.trim().toLowerCase() || ''
  const token = input.token?.trim() || ''

  if (!email || !token) {
    return {
      message: 'El enlace de verificación no es válido o está incompleto.',
      ok: false,
      status: 'verification_token_invalid',
    }
  }

  try {
    const payload = await getPayload({ config: await getPayloadConfig() })
    const existingUser = await findUserByEmail(email, payload)

    if (!existingUser) {
      return {
        email,
        message: 'No encontramos una cuenta pendiente con ese correo.',
        ok: false,
        status: 'verification_token_invalid',
      }
    }

    if (existingUser._verified) {
      return {
        email,
        message: 'Tu correo ya había sido confirmado. Ya puedes iniciar sesión.',
        ok: true,
        status: 'verification_already_completed',
      }
    }

    const matchedUser = await findUserByEmailAndVerificationToken({
      email,
      payload,
      token,
    })

    if (!matchedUser) {
      return {
        email,
        message: 'El enlace ya no es válido. Solicita uno nuevo para continuar.',
        ok: false,
        status: 'verification_token_invalid',
      }
    }

    await payload.verifyEmail({
      collection: 'users',
      token,
    })

    return {
      email,
      message: 'Tu correo fue confirmado correctamente. Ya puedes iniciar sesión.',
      ok: true,
      status: 'verification_completed',
    }
  } catch (error) {
    try {
      const payload = await getPayload({ config: await getPayloadConfig() })
      const refreshedUser = email ? await findUserByEmail(email, payload) : null

      if (refreshedUser?._verified) {
        return {
          email,
          message: 'Tu correo ya había sido confirmado. Ya puedes iniciar sesión.',
          ok: true,
          status: 'verification_already_completed',
        }
      }
    } catch {
      // Keep the original failure message if the fallback lookup also fails.
    }

    return {
      email,
      message:
        error instanceof Error ? error.message : 'No fue posible confirmar el correo electrónico.',
      ok: false,
      status: 'verification_token_invalid',
    }
  }
}

export async function registerCreatorAccount(input: {
  acceptedLegal: boolean
  accountType: AccountType
  country: string
  email: string
  genre: string
  name: string
  password: string
  req?: VerificationRequestLike
}): Promise<CreatorAuthResult> {
  try {
    const payload = await getPayload({ config: await getPayloadConfig() })
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

    if (existingUser && isConsumerIdentity(existingUser)) {
      return {
        message: CROSS_ACCOUNT_EMAIL_CONFLICT_MESSAGE,
        ok: false,
      }
    }

    if (existingUser && existingUser._verified !== false) {
      return {
        message: 'Este usuario ya está registrado.',
        ok: false,
      }
    }

    if (existingUser) {
      await issueVerificationEmail({
        payload,
        req: input.req,
        user: existingUser,
      })

      return {
        email,
        message: 'Te enviamos un nuevo enlace de verificación.',
        ok: true,
        status: 'verification_email_resent',
      }
    }

    const payloadReq = await createPayloadReqWithHeaders(input.req, payload)
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
        userType: input.accountType,
        username: buildUsernameSeed({ email, name }),
      },
      disableVerificationEmail: true,
      draft: false,
      overrideAccess: true,
      req: payloadReq,
      showHiddenFields: true,
    })

    const profileId =
      typeof createdUser.profile === 'string' ? createdUser.profile : createdUser.profile?.id

    if (profileId) {
      try {
        await payload.update({
          id: profileId,
          collection: 'profiles',
          data: {
            genre,
            location: country,
          },
          overrideAccess: true,
        })
      } catch (error) {
        payload.logger.error(
          {
            err: error,
            profileId,
            userEmail: email,
            userID: createdUser.id,
          },
          'Creator profile enrichment failed after user signup',
        )
      }
    }

    const verificationUser = createdUser as VerificationUser

    if (verificationUser._verificationToken) {
      await sendExistingVerificationEmail({
        payload,
        req: input.req,
        token: verificationUser._verificationToken,
        user: verificationUser,
      })
    } else {
      // Payload normally returns its native token when hidden fields are requested.
      // Keep a fallback for adapters that omit it from the create result.
      await issueVerificationEmail({
        payload,
        req: input.req,
        user: {
          editorAccess: createdUser.editorAccess,
          email: createdUser.email || email,
          id: createdUser.id,
          name: createdUser.name || name,
          userType: createdUser.userType,
        },
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
    const payload = await getPayload({ config: await getPayloadConfig() })
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
    if (error instanceof Error && error.name === 'LockedAuth') {
      return {
        message: getTemporaryLoginLockMessage(),
        ok: false,
      }
    }

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
