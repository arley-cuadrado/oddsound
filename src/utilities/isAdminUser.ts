type UserLike = {
  role?: null | string
} | null | undefined

export function isAdminUser(user: UserLike) {
  return user?.role === 'admin'
}
