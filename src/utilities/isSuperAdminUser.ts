type UserLike = {
  email?: null | string
  role?: null | string
} | null | undefined

const DEFAULT_SUPER_ADMIN_EMAILS = ['arley.cuadrado@icloud.com']

export function getSuperAdminEmails() {
  const configuredEmails = process.env.SUPER_ADMIN_EMAILS?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  return configuredEmails?.length ? configuredEmails : DEFAULT_SUPER_ADMIN_EMAILS
}

export function isConfiguredSuperAdminEmail(email?: null | string) {
  const normalizedEmail = email?.trim().toLowerCase()

  if (!normalizedEmail) return false

  return getSuperAdminEmails().includes(normalizedEmail)
}

export function isSuperAdminUser(user: UserLike) {
  return isConfiguredSuperAdminEmail(user?.email) && user?.role === 'admin'
}
