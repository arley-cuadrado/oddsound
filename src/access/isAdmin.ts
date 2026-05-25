import { hasFreshAdminAccess } from './hasFreshAdminAccess'
import { isAdminUser } from '@/utilities/isAdminUser'

export const isAdmin = async ({
  req,
}: {
  req: { payload: any; user?: { id?: number | string; role?: string | null } | null }
}) => {
  if (isAdminUser(req.user)) return true

  return hasFreshAdminAccess(req)
}
