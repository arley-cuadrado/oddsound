import type { Access, AccessArgs } from 'payload'

import type { User } from '@/payload-types'
import { hasFreshAdminAccess } from './hasFreshAdminAccess'

type CreatorOrAdminAccess = Access<User>

export const isCreatorOrAdmin: CreatorOrAdminAccess = async ({ req, req: { user } }: AccessArgs<User>) => {
  if (!user) return false

  if (await hasFreshAdminAccess(req as any)) return true

  // Creators can only read their own account
  return {
    id: {
      equals: user.id,
    },
  }
}
