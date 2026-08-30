'use server'

import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'
import { redirect } from 'next/navigation'

import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import { getMeUser } from '@/utilities/getMeUser'
import { findCreatorProfileByOwner } from '@/utilities/creatorProfiles'
import { resolveUserProfileID } from '@/utilities/userRelations'

function buildReturnTo(value?: FormDataEntryValue | null) {
  const rawValue = typeof value === 'string' ? value.trim() : ''

  if (!rawValue.startsWith('/dashboard/collections/comments')) {
    return '/dashboard/collections/comments'
  }

  return rawValue
}

export async function deleteDashboardComment(formData: FormData) {
  const commentID = typeof formData.get('commentId') === 'string' ? String(formData.get('commentId')) : ''
  const returnTo = buildReturnTo(formData.get('returnTo'))

  if (!commentID) {
    redirect(returnTo)
  }

  const { user } = await getMeUser()
  const payload = await getPayload({ config })
  const req = await createLocalReq({ user }, payload)
  const isAdmin = await hasFreshAdminAccess(req)

  const comment = await payload
    .findByID({
      collection: 'comments',
      id: commentID,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)

  if (!comment) {
    redirect(returnTo)
  }

  if (!isAdmin) {
    const userProfileID =
      resolveUserProfileID(user) ||
      (user.id
        ? await findCreatorProfileByOwner({
            ownerID: String(user.id),
            payload,
          })
        : null)

    if (!userProfileID || String(comment.artistProfile) !== String(userProfileID)) {
      redirect(returnTo)
    }
  }

  await payload.delete({
    collection: 'comments',
    id: commentID,
    overrideAccess: true,
    req,
  })

  redirect(returnTo)
}
