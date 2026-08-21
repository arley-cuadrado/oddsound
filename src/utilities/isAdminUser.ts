type UserLike = unknown

export function isAdminUser(user: UserLike) {
  if (!user || typeof user !== 'object') return false

  return (user as { role?: null | string }).role === 'admin'
}
