import type { Payload } from 'payload'

import { CREATOR_LEGAL_VERSION } from '@/utilities/creatorAuth'
import { ensureCreatorProfile } from '@/utilities/creatorProfiles'
import {
  SEED_ADMIN_EMAIL,
  SEED_BASE_DATE,
  SEED_EMAIL_DOMAIN,
  SEED_PASSWORD,
  seedEmail,
  seedPublishedAt,
} from './constants'
import { generateCover } from './covers'
import { artists as baseArtists, type ArtistFixture } from './fixtures/artists'
import { products as productFixtures } from './fixtures/products'
import { scenes as sceneFixtures } from './fixtures/scenes'
import { buildStressArtists } from './fixtures/stress'
import { withRetry } from './retry'
import { richText } from './richText'
import { deleteWhere, findOne, upsert, upsertMedia } from './upsert'

export type SeedOptions = {
  fresh?: boolean
  log?: (message: string) => void
  payload: Payload
  stress?: boolean
}

export type SeedSummary = {
  artists: number
  biographies: number
  products: number
  releases: number
  scenes: number
}

/** Collections whose documents carry an `owner` pointing at a seeded user. */
const OWNED_COLLECTIONS = [
  'products',
  'biographies',
  'pages',
  'posts',
  'media',
  'profiles',
] as const

function buildHero(index: number, mediaID: string, description: string) {
  // Rotates the three variants so every branch of getReleaseCardImage is exercised.
  const variant = index % 3

  if (variant === 0) {
    return { media: mediaID, type: 'highImpact' }
  }

  if (variant === 1) {
    return { media: mediaID, type: 'mediumImpact' }
  }

  return { albumImage: mediaID, richText: richText(description), type: 'lowImpact' }
}

async function findSeedUserIDs(payload: Payload) {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    where: {
      email: {
        like: SEED_EMAIL_DOMAIN,
      },
    },
  })

  return result.docs.map((doc) => String(doc.id))
}

/**
 * Removes only what the seed created, found through ownership. Deliberately not
 * a blanket wipe: real content in the same collections must survive.
 */
async function purge({ log, payload }: { log: (message: string) => void; payload: Payload }) {
  const userIDs = await findSeedUserIDs(payload)

  if (userIDs.length === 0) {
    log('  nada sembrado que limpiar')
    return
  }

  for (const collection of OWNED_COLLECTIONS) {
    const removed = await deleteWhere({
      collection,
      payload,
      where: {
        owner: {
          in: userIDs,
        },
      },
    })

    if (removed > 0) log(`  ${collection}: ${removed}`)
  }

  await withRetry(() =>
    payload.delete({
      collection: 'users',
      depth: 0,
      overrideAccess: true,
      where: {
        id: {
          in: userIDs,
        },
      },
    }),
  )

  log(`  users: ${userIDs.length}`)
}

async function ensureAdmin(payload: Payload) {
  return upsert({
    collection: 'users',
    // Without this flag ensureCreatorDefaults silently downgrades the role to creator.
    context: { allowAdminPromotion: true },
    data: {
      _verified: true,
      accountType: 'artist',
      email: SEED_ADMIN_EMAIL,
      isActive: true,
      name: 'Seed Admin',
      password: SEED_PASSWORD,
      role: 'admin',
      username: 'seed-admin',
    },
    payload,
    where: {
      email: {
        equals: SEED_ADMIN_EMAIL,
      },
    },
  })
}

async function ensureCreator({ artist, payload }: { artist: ArtistFixture; payload: Payload }) {
  const email = seedEmail(artist.slug)

  return upsert({
    collection: 'users',
    data: {
      _verified: true,
      accountType: artist.accountType,
      email,
      isActive: true,
      legalAccepted: true,
      legalAcceptedAt: SEED_BASE_DATE.toISOString(),
      legalAcceptedVersion: CREATOR_LEGAL_VERSION,
      name: artist.displayName,
      password: SEED_PASSWORD,
      role: 'creator',
      // Unique per fixture, and stable so re-runs match the same account.
      username: artist.slug,
    },
    payload,
    where: {
      email: {
        equals: email,
      },
    },
  })
}

export async function seed({
  fresh = false,
  log = () => {},
  payload,
  stress = false,
}: SeedOptions): Promise<SeedSummary> {
  const artists = stress ? [...baseArtists, ...buildStressArtists()] : baseArtists
  const summary: SeedSummary = {
    artists: 0,
    biographies: 0,
    products: 0,
    releases: 0,
    scenes: 0,
  }

  if (fresh) {
    log('Limpiando datos sembrados...')
    await purge({ log, payload })
  }

  log('Creando cuenta administradora...')
  const adminUser = await ensureAdmin(payload)
  const adminID = String(adminUser.id)

  const releasePageIDs = new Map<string, string>()
  const artistRefs = new Map<string, { profileID: string; userID: string }>()

  let releaseIndex = 0

  for (const artist of artists) {
    const user = await ensureCreator({ artist, payload })
    const userID = String(user.id)

    // The afterOperation hook creates the profile on first insert; this also
    // covers a re-run where the user exists but the profile was removed.
    const profileID = String(
      await withRetry(() =>
        ensureCreatorProfile({
          payload,
          user: {
            accountType: artist.accountType,
            email: user.email,
            id: userID,
            name: artist.displayName,
            profile: user.profile,
            role: 'creator',
          },
        }),
      ),
    )

    const avatar = await upsertMedia({
      alt: `Imagen de ${artist.displayName}`,
      buildBuffer: () =>
        generateCover({
          height: 900,
          label: artist.displayName,
          seed: artist.slug,
          subtitle: `${artist.genre} · ${artist.country}`,
          width: 900,
        }),
      filename: `seed-avatar-${artist.slug}.webp`,
      owner: userID,
      payload,
    })
    const avatarID = String(avatar.id)

    // ensureCreatorProfile only fills name and slug, so genre and country —
    // which is what Discovery filters on — have to be written here.
    await withRetry(() =>
      payload.update({
        collection: 'profiles',
        id: profileID,
        context: { disableRevalidate: true },
        data: {
          accountType: artist.accountType,
          avatar: avatarID,
          bio: artist.bio,
          displayName: artist.displayName,
          genre: artist.genre,
          location: artist.country,
          slug: artist.slug,
        },
        depth: 0,
        overrideAccess: true,
      }),
    )

    artistRefs.set(artist.slug, { profileID, userID })
    summary.artists += 1

    for (const release of artist.releases) {
      const cover = await upsertMedia({
        alt: `Portada de ${release.title}`,
        buildBuffer: () =>
          generateCover({
            label: release.title,
            seed: release.slug,
            subtitle: artist.displayName,
          }),
        filename: `seed-release-${release.slug}.webp`,
        owner: userID,
        payload,
      })
      const coverID = String(cover.id)

      const publishedAt = seedPublishedAt(releaseIndex)
      const page = await upsert({
        collection: 'pages',
        data: {
          _status: 'published',
          hero: buildHero(releaseIndex, coverID, release.description),
          layout: [
            {
              blockType: 'content',
              columns: [
                {
                  enableLink: false,
                  richText: richText(release.description),
                  size: 'full',
                },
              ],
            },
            { blockType: 'spotifyBlock', spotify: release.spotify },
            { blockType: 'mediaBlock', media: coverID },
          ],
          meta: {
            description: release.description,
            image: coverID,
            title: `${release.title} — ${artist.displayName}`,
          },
          owner: userID,
          profile: profileID,
          publishedAt,
          // Explicit: the slug hook would otherwise stamp today's date and
          // break idempotency across days.
          slug: release.slug,
          title: release.title,
        },
        payload,
        where: {
          slug: {
            equals: release.slug,
          },
        },
      })

      // populatePublishedAt stamps `now` whenever a page is created already
      // published, which would flatten the staggered ordering. Restore the
      // intended date; on an update the hook leaves it alone, so this is a
      // no-op from the second run onwards.
      if (String(page.publishedAt) !== publishedAt) {
        await withRetry(() =>
          payload.update({
            collection: 'pages',
            id: String(page.id),
            context: { disableRevalidate: true },
            data: { publishedAt },
            depth: 0,
            overrideAccess: true,
          }),
        )
      }

      releasePageIDs.set(release.slug, String(page.id))
      summary.releases += 1
      releaseIndex += 1
    }

    await upsert({
      collection: 'biographies',
      data: {
        hero: { media: avatarID, type: 'mediumImpact' },
        layout: [
          {
            blockType: 'content',
            columns: [{ richText: richText(artist.bio), size: 'full' }],
          },
        ],
        owner: userID,
        profile: profileID,
        title: artist.displayName,
      },
      payload,
      where: {
        owner: {
          equals: userID,
        },
      },
    })

    summary.biographies += 1
    log(`  ${artist.displayName}: ${artist.releases.length} lanzamientos`)
  }

  log('Creando escenas...')

  for (const [index, scene] of sceneFixtures.entries()) {
    const cover = await upsertMedia({
      alt: scene.title,
      buildBuffer: () =>
        generateCover({
          label: scene.title,
          seed: scene.slug,
          subtitle: 'Escena',
        }),
      filename: `seed-scene-${scene.slug}.webp`,
      owner: adminID,
      payload,
    })
    const coverID = String(cover.id)

    await upsert({
      collection: 'posts',
      data: {
        _status: 'published',
        content: richText(...scene.body),
        heroImage: coverID,
        meta: {
          description: scene.excerpt,
          image: coverID,
          title: scene.title,
        },
        owner: adminID,
        publishedAt: seedPublishedAt(index * 2),
        slug: scene.slug,
        title: scene.title,
      },
      payload,
      where: {
        slug: {
          equals: scene.slug,
        },
      },
    })

    summary.scenes += 1
  }

  log('Creando productos...')

  for (const product of productFixtures) {
    const artistRef = artistRefs.get(product.artistSlug)
    const releasePageID = releasePageIDs.get(product.releaseSlug)

    if (!artistRef || !releasePageID) {
      log(`  omitido ${product.slug}: falta el artista o el lanzamiento`)
      continue
    }

    // Matched on the base name, like `upsertMedia` does: when `public/media`
    // already holds a file, Payload stores the next one as `name-1.webp`, and an
    // exact match then silently leaves every product without a cover.
    const releaseCover = await findOne({
      collection: 'media',
      payload,
      where: {
        filename: {
          like: `seed-release-${product.releaseSlug}`,
        },
      },
    })

    await upsert({
      collection: 'products',
      data: {
        _status: 'published',
        checkoutButtonLabel: 'Agregar al carrito',
        checkoutProvider: 'mercadopago',
        ...(releaseCover ? { coverImage: String(releaseCover.id) } : {}),
        description: product.description,
        inventory: 25,
        owner: artistRef.userID,
        priceInCOP: product.priceInCOP,
        priceInCOPEnabled: true,
        productType: product.productType,
        profile: artistRef.profileID,
        release: releasePageID,
        requiresShipping: product.productType === 'physical',
        slug: product.slug,
        title: product.title,
      },
      payload,
      where: {
        slug: {
          equals: product.slug,
        },
      },
    })

    summary.products += 1
  }

  return summary
}
