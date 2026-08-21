type UserLike = unknown

function readUserFields(user: UserLike) {
  if (!user || typeof user !== 'object') {
    return {
      editorAccess: false,
      role: null,
    }
  }

  const candidate = user as {
    editorAccess?: boolean | null
    role?: null | string
  }

  return {
    editorAccess: Boolean(candidate.editorAccess),
    role: candidate.role || null,
  }
}

export function isEditorialUser(user: UserLike) {
  const candidate = readUserFields(user)

  return candidate.role === 'creator' && candidate.editorAccess
}

export function isMusicalCreatorUser(user: UserLike) {
  const candidate = readUserFields(user)

  return candidate.role === 'creator' && !candidate.editorAccess
}
