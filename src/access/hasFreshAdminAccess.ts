import type { PayloadRequest } from 'payload'

import { isAdminUser } from '@/utilities/isAdminUser'

type ReqLike = {
  payload: PayloadRequest['payload']
  user?: { id?: number | string; role?: null | string } | null
}

export async function hasFreshAdminAccess(req: ReqLike): Promise<boolean> {
  const currentUser = req.user

  if (!currentUser?.id) return false
  if (isAdminUser(currentUser)) return true

  try {
    const latestUser = await req.payload.findByID({
      id: currentUser.id,
      collection: 'users',
      depth: 0,
      overrideAccess: true,
    })

    return isAdminUser(latestUser)
  } catch {
    return false
  }
}
