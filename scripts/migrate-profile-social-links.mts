import 'dotenv/config'

import configPromise from '../src/payload.config.ts'
import { getPayload } from 'payload'
import { normalizeSocialLinksWithLegacy } from '../src/utilities/socialLinks.ts'

async function main() {
  const payload = await getPayload({ config: configPromise })
  const profiles = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 10000,
    overrideAccess: true,
    pagination: false,
    select: {
      displayName: true,
      owner: true,
      profileType: true,
    },
  })

  let migrated = 0
  let skipped = 0

  for (const profile of profiles.docs) {
    if (profile.profileType === 'editorial') continue

    const releases = await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      sort: '-updatedAt',
      select: { layout: true, socialLinks: true },
      where: { profile: { equals: profile.id } },
    } as any)
    const source = (releases.docs as any[]).find((release) => {
      return normalizeSocialLinksWithLegacy(release).socialLinks?.length
    })
    const socialLinks = source ? normalizeSocialLinksWithLegacy(source).socialLinks || [] : []

    if (socialLinks.length === 0) continue

    const biographies = await payload.find({
      collection: 'biographies',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { profile: { equals: profile.id } },
    } as any)
    const biography = biographies.docs[0]

    if (biography?.socialLinks?.length) {
      skipped += 1
      continue
    }

    if (biography) {
      await payload.update({
        collection: 'biographies',
        id: biography.id,
        data: { socialLinks },
        depth: 0,
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'biographies',
        data: {
          hero: { type: 'mediumImpact' },
          layout: [],
          owner: profile.owner,
          profile: profile.id,
          socialLinks,
          title: profile.displayName || 'Biografía',
        },
        depth: 0,
        overrideAccess: true,
      })
    }

    migrated += 1
  }

  console.log(
    `Migrated ${migrated} artist profiles; skipped ${skipped} already configured biographies.`,
  )
}

void main()
