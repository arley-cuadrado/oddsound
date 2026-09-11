'use server'

import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

import { resendVerificationEmail } from '@/app/(frontend)/creator/actions'
import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { getMeUser } from '@/utilities/getMeUser'
import {
  createEditorInvitation,
  type EditorInviteResult,
} from '@/utilities/editorInvites'

async function assertAdminSession() {
  const { user } = await getMeUser()
  const payload = await getPayload({ config })
  const req = await createLocalReq({ user }, payload)
  const isAdmin = await hasFreshAdminAccess(req)

  if (!isAdmin) {
    throw new Error('No tienes permisos para gestionar cuentas editoriales.')
  }

  return { payload, req, user }
}

export async function submitEditorInvitation(input: {
  email: string
  fullName: string
  password: string
}): Promise<EditorInviteResult> {
  const { payload, req, user } = await assertAdminSession()

  return createEditorInvitation({
    adminUser: user,
    email: input.email,
    fullName: input.fullName,
    password: input.password,
    payload,
    req,
  })
}

export async function resendEditorInvitation(input: {
  email: string
}): Promise<EditorInviteResult> {
  await assertAdminSession()

  const result = await resendVerificationEmail({
    email: input.email,
  })

  return {
    email: result.email,
    message:
      result.message ||
      (result.ok ? 'Te enviamos un nuevo enlace de verificación.' : 'No fue posible reenviar el correo.'),
    ok: result.ok,
    showResend: !result.ok && result.status === 'pending_verification',
    status:
      result.ok && result.status === 'verification_email_resent'
        ? 'created_and_sent'
        : result.status === 'pending_verification'
          ? 'existing_pending_verification'
          : 'validation_error',
  }
}
