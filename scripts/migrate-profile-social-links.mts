import 'dotenv/config'

import { normalizeSocialLinksWithLegacy } from '../src/utilities/socialLinks.ts'

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Add it to .env.migration.local and run the command again.')
  }

  console.log('Loading Payload configuration...')
  const [{ default: configPromise }, { getPayload }] = await Promise.all([
    import('../src/payload.config.ts'),
    import('payload'),
  ])

  console.log('Connecting to MongoDB...')
  const payload = await getPayload({ config: configPromise })
  console.log('Connected. Reading artist profiles...')
  try {
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

    console.log(`Processing ${profile.displayName || profile.id}...`)

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

  return { migrated, skipped }
  } finally {
    await payload.db.connection.close()
  }
}

void main()
  .then(({ migrated, skipped }) => {
    console.log(
      `Migrated ${migrated} artist profiles; skipped ${skipped} already configured biographies.`,
    )
  })
  .catch((error) => {
    console.error('Profile social links migration failed:', error)
    process.exitCode = 1
  })
