type UserLike = unknown

function readUserFields(user: UserLike) {
  if (!user || typeof user !== 'object') {
    return {
      accountType: null,
      editorAccess: false,
      role: null,
      userType: null,
    }
  }

  const candidate = user as {
    accountType?: null | string
    editorAccess?: boolean | null
    role?: null | string
    userType?: null | string
  }

  return {
    accountType: candidate.accountType || null,
    editorAccess: Boolean(candidate.editorAccess),
    role: candidate.role || null,
    userType: candidate.userType || null,
  }
}

export function isFanUser(user: UserLike) {
  const candidate = readUserFields(user)

  return candidate.role === 'creator' && (candidate.userType === 'consumer' || candidate.userType === 'fan')
}

export function canAccessPayloadDashboard(user: UserLike) {
  const candidate = readUserFields(user)

  if (candidate.role === 'admin') return true

  return candidate.role === 'creator' && !isFanUser(user)
}

export function hasEditorialIdentity(user: UserLike) {
  const candidate = readUserFields(user)

  return candidate.userType === 'editor' || candidate.editorAccess
}

export function getUserLoginPath(user: UserLike) {
  const candidate = readUserFields(user)

  if (isFanUser(user)) return '/fan/login'
  if (candidate.role === 'creator') return '/dashboard/login'

  return '/dashboard/login'
}

export function isEditorialUser(user: UserLike) {
  const candidate = readUserFields(user)

  return (
    candidate.role === 'creator' &&
    !isFanUser(user) &&
    hasEditorialIdentity(user)
  )
}

export function isMusicalCreatorUser(user: UserLike) {
  const candidate = readUserFields(user)

  const hasMusicalUserType = candidate.userType === 'artist' || candidate.userType === 'band'
  const hasLegacyMusicalShape =
    !candidate.editorAccess &&
    (candidate.userType === 'creator' ||
      candidate.accountType === 'artist' ||
      candidate.accountType === 'band')

  return candidate.role === 'creator' && !isFanUser(user) && (hasMusicalUserType || hasLegacyMusicalShape)
}
