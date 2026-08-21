import type { CollectionAfterOperationHook } from 'payload'

import { ensureCreatorProfile } from '@/utilities/creatorProfiles'

export const createProfile: CollectionAfterOperationHook<'users'> = async ({
  operation,
  req,
  result,
}) => {
  if (operation !== 'create') return result
  if (!result || typeof result !== 'object' || !('role' in result)) return result
  if (result.role !== 'creator') return result

  const profileID = await ensureCreatorProfile({
    payload: req.payload,
    req,
    user: {
      accountType: result.accountType,
      editorAccess: result.editorAccess,
      email: result.email,
      id: result.id,
      name: result.name,
      profile: result.profile,
      role: result.role,
    },
  })

  return {
    ...result,
    profile: profileID,
  }
}
