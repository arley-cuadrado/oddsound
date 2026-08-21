export function isEditorialUsersAdminRoute(args?: {
  pathname?: null | string
  search?: null | string
}) {
  const pathname = args?.pathname || ''
  const search = args?.search || ''

  if (!pathname.includes('/dashboard/collections/users')) return false

  const params = new URLSearchParams(search)

  return params.get('editors') === '1'
}
