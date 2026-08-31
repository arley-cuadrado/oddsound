import type { CollectionAfterOperationHook } from 'payload'

import { ensureConsumerProfile } from '@/utilities/consumerProfiles'
import { ensureCreatorProfile } from '@/utilities/creatorProfiles'

export const createProfile: CollectionAfterOperationHook<'users'> = async ({
  operation,
  req,
  result,
}) => {
  if (operation !== 'create') return result
  if (!result || typeof result !== 'object' || !('role' in result)) return result

  if ((result.userType as string | null | undefined) === 'consumer' || result.userType === 'fan') {
    try {
      const consumerProfileID = await ensureConsumerProfile({
        payload: req.payload,
        req,
        user: {
          consumerProfile: result.consumerProfile,
          email: result.email,
          id: result.id,
          name: result.name,
          userType: result.userType,
        },
      })

      return {
        ...result,
        consumerProfile: consumerProfileID,
      }
    } catch (error) {
      req.payload.logger.error(
        {
          err: error,
          userEmail: result.email,
          userID: result.id,
        },
        'Consumer profile creation failed after user signup',
      )

      return result
    }
  }

  if (result.role !== 'creator') return result

  try {
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
        userType: result.userType,
      },
    })

    return {
      ...result,
      profile: profileID,
    }
  } catch (error) {
    req.payload.logger.error(
      {
        err: error,
        userEmail: result.email,
        userID: result.id,
      },
      'Creator profile creation failed after user signup',
    )

    return result
  }
}
