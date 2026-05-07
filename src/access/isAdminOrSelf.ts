import type { Access, AccessArgs } from 'payload'

import type { User } from '@/payload-types'
import { isAdminUser } from '@/utilities/isAdminUser'

type AdminOrSelfAccess = Access<User>

export const isAdminOrSelf: AdminOrSelfAccess = ({ req: { user } }: AccessArgs<User>) => {
  if (!user) return false

  if (isAdminUser(user)) return true

  return {
    id: {
      equals: user.id,
    },
  }
}
