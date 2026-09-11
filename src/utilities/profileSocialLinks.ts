import type { Biography } from '@/payload-types'
import type { Payload } from 'payload'

const PROFILE_SOCIAL_LINKS_SELECT = {
  socialLinks: true,
} as const

export async function getProfileSocialLinks(args: {
  payload: Payload
  profileID: number | string
}): Promise<NonNullable<Biography['socialLinks']>> {
  const result = await args.payload.find({
    collection: 'biographies',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    select: PROFILE_SOCIAL_LINKS_SELECT,
    where: {
      profile: {
        equals: args.profileID,
      },
    },
  })

  const socialLinks = result.docs[0]?.socialLinks

  return Array.isArray(socialLinks) ? socialLinks : []
}
