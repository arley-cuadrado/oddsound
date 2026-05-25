import type { Access, AccessArgs } from 'payload'

import type { User } from '@/payload-types'
import { hasFreshAdminAccess } from './hasFreshAdminAccess'

type AdminOrSelfAccess = Access<User>

export const isAdminOrSelf: AdminOrSelfAccess = async ({ req, req: { user } }: AccessArgs<User>) => {
  if (!user) return false

  if (await hasFreshAdminAccess(req as any)) return true

  return {
    id: {
      equals: user.id,
    },
  }
}
