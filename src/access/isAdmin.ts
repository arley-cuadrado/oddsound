import { isAdminUser } from '@/utilities/isAdminUser'

export const isAdmin = ({ req: { user } }: { req: { user?: { role?: string | null } | null } }) =>
  isAdminUser(user)
