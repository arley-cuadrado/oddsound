type UserLike = unknown

function readUserFields(user: UserLike) {
  if (!user || typeof user !== 'object') {
    return {
      editorAccess: false,
      role: null,
      userType: null,
    }
  }

  const candidate = user as {
    editorAccess?: boolean | null
    role?: null | string
    userType?: null | string
  }

  return {
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

export function isEditorialUser(user: UserLike) {
  const candidate = readUserFields(user)

  return candidate.role === 'creator' && !isFanUser(user) && candidate.editorAccess
}

export function isMusicalCreatorUser(user: UserLike) {
  const candidate = readUserFields(user)

  return candidate.role === 'creator' && !isFanUser(user) && !candidate.editorAccess
}
