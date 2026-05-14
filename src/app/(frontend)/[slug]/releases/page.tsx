import type { Metadata } from 'next'

import configPromise from '@payload-config'
import type { Profile } from '@/payload-types'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { buildProfilesByOwnerId, mapRelease } from '../../home-components/releaseData'
import type { ReleaseItem } from '../../home-components/types'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const profiles = await payload.find({
    collection: 'profiles',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: {
      slug: true,
    },
  })

  return profiles.docs
    .filter((profile) => typeof profile.slug === 'string' && profile.slug)
    .map((profile) => ({ slug: profile.slug as string }))
}

async function queryProfileBySlug(slug: string) {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'profiles',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs[0] || null
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const profile = await queryProfileBySlug(decodeURIComponent(slug))
  const bandName = profile?.displayName || 'Artist'

  return {
    description: `Explore every release published by ${bandName}.`,
    title: `${bandName} Releases`,
  }
}

export default async function ArtistReleasesPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const profile = await queryProfileBySlug(decodedSlug)

  if (!profile) {
    notFound()
  }

  const payload = await getPayload({ config: configPromise })
  const pagesResult = await payload.find({
    collection: 'pages',
    depth: 2,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    sort: '-publishedAt',
    where: {
      and: [
        {
          _status: {
            equals: 'published',
          },
        },
        {
          profile: {
            equals: profile.id,
          },
        },
      ],
    },
  })

  const profilesByOwnerId = buildProfilesByOwnerId([profile as Profile])
  const releases = pagesResult.docs
    .map((page) => mapRelease(page, profilesByOwnerId))
    .filter((release): release is ReleaseItem => Boolean(release))

  const bandName = profile.displayName || 'Artist'

  return (
    <div className="mx-auto max-w-4xl pb-24 pt-24">
      <div className="container">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {bandName} Releases
          </h1>
          <p className="mt-4 text-sm text-slate-500 dark:text-gray-400">
            Explore every release published by {bandName}.
          </p>
        </header>

        <div className="mx-auto max-w-[50rem]">
          {releases.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:gap-6 xl:grid-cols-4">
              {releases.map((release) => (
                <article className="w-full" key={release.id}>
                  <Link href={`/${release.releaseSlug}`}>
                    <div>
                      <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {release.imageUrl ? (
                          <img
                            alt={release.releaseTitle}
                            className="h-full w-full object-cover"
                            src={release.imageUrl}
                          />
                        ) : null}
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 py-3 text-white md:px-4">
                          <h2 className="text-[10px] font-semibold leading-snug text-white">
                            {release.releaseTitle}
                          </h2>
                          <div className="flex w-full flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                            <p className="max-w-full text-[10px] leading-snug text-white">
                              {release.creatorName}
                              {release.genre ? (
                                <span className="text-white/85"> · {release.genre}</span>
                              ) : null}
                            </p>
                            <p className="text-[10px] text-white sm:shrink-0">
                              {release.country || 'Country'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-gray-400">
              No releases published yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
