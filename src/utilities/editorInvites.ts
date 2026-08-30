import type { Payload, PayloadRequest } from 'payload'

import {
  CROSS_ACCOUNT_EMAIL_CONFLICT_MESSAGE,
  findUserByEmail,
} from '@/utilities/creatorAuth'
import { ensureCreatorProfile } from '@/utilities/creatorProfiles'
import { isAdminUser } from '@/utilities/isAdminUser'

export type EditorSocialPlatform = 'facebook' | 'instagram' | 'threads' | 'x'

export type EditorSocialRow = {
  platform: EditorSocialPlatform
  value: string
}

export type EditorInviteStatus =
  | 'created_and_sent'
  | 'existing_pending_verification'
  | 'existing_verified'
  | 'validation_error'

export type EditorInviteResult = {
  email?: string
  message: string
  ok: boolean
  showResend?: boolean
  status: EditorInviteStatus
}

type EditorLikeUser = Pick<
  {
    _verified?: boolean | null
    editorAccess?: boolean | null
    email?: string | null
    id: string
    name?: string | null
    profile?: null | string | { id?: null | string }
    role?: string | null
    userType?: string | null
  },
  '_verified' | 'editorAccess' | 'email' | 'id' | 'name' | 'profile' | 'role' | 'userType'
> & {
  accountType?: 'artist' | 'band' | 'label' | null
  authProvider?: null | string
}

function isConsumerIdentity(user?: null | Pick<EditorLikeUser, 'authProvider' | 'userType'>) {
  return user?.userType === 'consumer' || user?.userType === 'fan' || user?.authProvider === 'google'
}

function normalizeSocialRows(rows: EditorSocialRow[]) {
  return rows.reduce(
    (acc, row) => {
      const value = row.value.trim()

      if (!value) return acc

      acc[row.platform] = value
      return acc
    },
    {
      facebook: '',
      instagram: '',
      threads: '',
      x: '',
    },
  )
}

function getExistingEditorState(user: EditorLikeUser) {
  const email = typeof user.email === 'string' ? user.email : undefined

  if (!user.editorAccess) {
    if (isConsumerIdentity(user)) {
      return {
        message: CROSS_ACCOUNT_EMAIL_CONFLICT_MESSAGE,
        ok: false,
        showResend: false,
        status: 'validation_error' as const,
      }
    }

    return {
      message: 'Este correo ya está asociado a otra cuenta dentro de oddsound.',
      ok: false,
      showResend: false,
      status: 'validation_error' as const,
    }
  }

  if (user._verified === false) {
    return {
      email,
      message:
        'Este editor ya existe y sigue pendiente de confirmar su correo. Puedes reenviar el enlace desde aquí.',
      ok: false,
      showResend: true,
      status: 'existing_pending_verification' as const,
    }
  }

  return {
      email,
    message: 'Esta cuenta editor ya está verificada. Ya puede iniciar sesión.',
    ok: false,
    showResend: false,
    status: 'existing_verified' as const,
  }
}

function getProfileID(profile: EditorLikeUser['profile']) {
  if (typeof profile === 'string') return profile
  if (profile && typeof profile === 'object' && typeof profile.id === 'string') return profile.id
  return null
}

export async function createEditorInvitation(args: {
  adminUser: { email?: null | string; id?: null | string; role?: null | string } | null
  email: string
  fullName: string
  password: string
  payload: Payload
  req: PayloadRequest
  socialRows?: EditorSocialRow[]
}): Promise<EditorInviteResult> {
  const { adminUser, payload, req } = args
  const email = args.email.trim().toLowerCase()
  const fullName = args.fullName.trim()
  const password = args.password
  const socialRows = Array.isArray(args.socialRows) ? args.socialRows : []

  if (!adminUser?.id || !isAdminUser(adminUser)) {
    return {
      message: 'No tienes permisos para crear cuentas editoriales.',
      ok: false,
      showResend: false,
      status: 'validation_error',
    }
  }

  if (!email || !fullName || !password) {
    return {
      message: 'Nombre completo, correo electrónico y contraseña son obligatorios.',
      ok: false,
      showResend: false,
      status: 'validation_error',
    }
  }

  const existingUser = await findUserByEmail(email, payload)

  if (existingUser) {
    return getExistingEditorState(existingUser)
  }

  try {
    const createdUser = (await payload.create({
      collection: 'users',
      data: {
        editorAccess: true,
        email,
        name: fullName,
        password,
        role: 'creator',
        username: fullName,
      },
      draft: false,
      overrideAccess: true,
      req,
      showHiddenFields: true,
    })) as EditorLikeUser

    const ensuredProfile = await ensureCreatorProfile({
      payload,
      req,
      user: {
        accountType: createdUser.accountType,
        editorAccess: createdUser.editorAccess,
        email: createdUser.email,
        id: createdUser.id,
        name: createdUser.name,
        profile: createdUser.profile,
        role: createdUser.role,
        userType: createdUser.userType,
      },
    })
    const profileID = getProfileID(ensuredProfile) || getProfileID(createdUser.profile)

    const editorSocials = normalizeSocialRows(socialRows)

    if (profileID && Object.values(editorSocials).some(Boolean)) {
      await payload.update({
        id: profileID,
        collection: 'profiles',
        data: {
          editorSocials,
        },
        depth: 0,
        overrideAccess: true,
        req,
      })
    }

    return {
      email,
      message: 'Editor creado correctamente. Ya enviamos el correo para confirmar la cuenta.',
      ok: true,
      showResend: false,
      status: 'created_and_sent',
    }
  } catch (error) {
    const recoveredUser = await findUserByEmail(email, payload).catch(() => null)

    if (recoveredUser) {
      return getExistingEditorState(recoveredUser)
    }

    return {
      email,
      message:
        error instanceof Error
          ? error.message
          : 'No fue posible crear la cuenta editorial en este momento.',
      ok: false,
      showResend: false,
      status: 'validation_error',
    }
  }
}
