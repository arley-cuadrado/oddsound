import type { CollectionAfterDeleteHook } from 'payload'

import type { User } from '@/payload-types'

async function findOwnedDocumentIDs(args: {
  collection: 'media' | 'pages' | 'posts' | 'profiles'
  ownerID: number | string
  req: Parameters<CollectionAfterDeleteHook<User>>[0]['req']
}) {
  const { collection, ownerID, req } = args
  const ids: Array<number | string> = []
  let hasNextPage = true
  let page = 1

  while (hasNextPage) {
    const result = await req.payload.find({
      collection,
      depth: 0,
      limit: 100,
      overrideAccess: true,
      page,
      pagination: true,
      where: {
        owner: {
          equals: ownerID,
        },
      },
    })

    ids.push(...result.docs.map((entry) => entry.id))
    hasNextPage = result.hasNextPage
    page += 1
  }

  return ids
}

export const deleteCreatorData: CollectionAfterDeleteHook<User> = async ({ doc, req }) => {
  if (doc.role !== 'creator') return doc

  const ownerID = doc.id

  const [profileIDs, pageIDs, postIDs, mediaIDs] = await Promise.all([
    findOwnedDocumentIDs({ collection: 'profiles', ownerID, req }),
    findOwnedDocumentIDs({ collection: 'pages', ownerID, req }),
    findOwnedDocumentIDs({ collection: 'posts', ownerID, req }),
    findOwnedDocumentIDs({ collection: 'media', ownerID, req }),
  ])

  await Promise.all([
    ...pageIDs.map((pageID) =>
      req.payload.delete({
        collection: 'pages',
        req,
        where: {
          id: {
            equals: pageID,
          },
        },
      }),
    ),
    ...postIDs.map((postID) =>
      req.payload.delete({
        collection: 'posts',
        req,
        where: {
          id: {
            equals: postID,
          },
        },
      }),
    ),
    ...mediaIDs.map((mediaID) =>
      req.payload.delete({
        collection: 'media',
        req,
        where: {
          id: {
            equals: mediaID,
          },
        },
      }),
    ),
    ...profileIDs.map((profileID) =>
      req.payload.delete({
        collection: 'profiles',
        req,
        where: {
          id: {
            equals: profileID,
          },
        },
      }),
    ),
  ])

  return doc
}
