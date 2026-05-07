type UserLike = {
  email?: null | string
  role?: null | string
} | null | undefined

const SUPER_ADMIN_EMAILS = ['arley.cuadrado@icloud.com']

export function isSuperAdminUser(user: UserLike) {
  const email = user?.email?.trim().toLowerCase()

  if (!email) return false

  return SUPER_ADMIN_EMAILS.includes(email) && (!user?.role || user.role === 'admin')
}
