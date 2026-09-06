type MigratableUser = {
  accountType?: 'artist' | 'band' | 'label' | null
  editorAccess?: boolean | null
  id: string
  role?: null | string
  userType?: null | string
}

type UserIdentityPatch = {
  accountType?: 'artist' | 'band' | null
  userType?: 'artist' | 'band' | 'editor' | 'fan'
}

function isMusicalAccountType(
  value: MigratableUser['accountType'],
): value is 'artist' | 'band' {
  return value === 'artist' || value === 'band'
}

export function getUserIdentityMigrationPatch(user: MigratableUser): null | UserIdentityPatch {
  if (user.role !== 'creator') return null

  if (user.editorAccess) {
    const patch: UserIdentityPatch = {}

    if (user.userType !== 'editor') {
      patch.userType = 'editor'
    }

    if (user.accountType !== null && typeof user.accountType !== 'undefined') {
      patch.accountType = null
    }

    return Object.keys(patch).length > 0 ? patch : null
  }

  if (user.userType === 'fan' || user.userType === 'consumer') {
    const patch: UserIdentityPatch = {}

    if (user.userType !== 'fan') {
      patch.userType = 'fan'
    }

    if (user.accountType !== null && typeof user.accountType !== 'undefined') {
      patch.accountType = null
    }

    return Object.keys(patch).length > 0 ? patch : null
  }

  if (isMusicalAccountType(user.accountType)) {
    if (user.userType !== user.accountType) {
      return {
        userType: user.accountType,
      }
    }

    return null
  }

  return null
}
