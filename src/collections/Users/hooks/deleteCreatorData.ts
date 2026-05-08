import type { CollectionAfterDeleteHook } from 'payload'

import type { User } from '@/payload-types'

export const deleteCreatorData: CollectionAfterDeleteHook<User> = async ({ doc, req }) => {
  if (doc.role !== 'creator') return doc

  const ownerID = doc.id

  const [profilesResult, pagesResult, postsResult, mediaResult] = await Promise.all([
    req.payload.find({
      collection: 'profiles',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      where: {
        owner: {
          equals: ownerID,
        },
      },
    }),
    req.payload.find({
      collection: 'pages',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      where: {
        owner: {
          equals: ownerID,
        },
      },
    }),
    req.payload.find({
      collection: 'posts',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      where: {
        owner: {
          equals: ownerID,
        },
      },
    }),
    req.payload.find({
      collection: 'media',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      where: {
        owner: {
          equals: ownerID,
        },
      },
    }),
  ])

  await Promise.all([
    ...pagesResult.docs.map((page) =>
      req.payload.delete({
        collection: 'pages',
        id: page.id,
        overrideAccess: true,
      }),
    ),
    ...postsResult.docs.map((post) =>
      req.payload.delete({
        collection: 'posts',
        id: post.id,
        overrideAccess: true,
      }),
    ),
    ...mediaResult.docs.map((media) =>
      req.payload.delete({
        collection: 'media',
        id: media.id,
        overrideAccess: true,
      }),
    ),
    ...profilesResult.docs.map((profile) =>
      req.payload.delete({
        collection: 'profiles',
        id: profile.id,
        overrideAccess: true,
      }),
    ),
  ])

  return doc
}
