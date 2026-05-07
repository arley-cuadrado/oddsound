import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

type Collection = keyof Config['collections']

async function getDocument(collection: Collection, slug: string, depth = 0) {
  const payload = await getPayload({ config: configPromise })

  try {
    const document = await payload.findByID({
      collection,
      id: slug,
      depth,
      overrideAccess: true,
    })

    return document
  } catch {
    const result = await payload.find({
      collection,
      depth,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        slug: {
          equals: slug,
        },
      },
    })

    return result.docs[0]
  }
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedDocument = (collection: Collection, slug: string) =>
  unstable_cache(async () => getDocument(collection, slug), [collection, slug], {
    tags: [`${collection}_${slug}`],
  })
