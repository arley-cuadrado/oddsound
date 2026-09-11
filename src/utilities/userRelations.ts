type UserLike = {
  consumerProfile?: null | number | string | { id?: null | number | string }
  profile?: null | number | string | { id?: null | number | string }
} | null | undefined

function readRelationID(value: null | number | string | { id?: null | number | string } | undefined): null | string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (value && typeof value === 'object' && value.id != null) {
    return String(value.id)
  }

  return null
}

export function resolveUserConsumerProfileID(user: UserLike) {
  return readRelationID(user?.consumerProfile)
}

export function resolveUserProfileID(user: UserLike) {
  return readRelationID(user?.profile)
}
