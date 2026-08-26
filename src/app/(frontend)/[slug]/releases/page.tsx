import type { Metadata } from 'next'

import configPromise from '@payload-config'
import type { Page, Profile } from '@/payload-types'
import { getPayload } from 'payload'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import {
  PROFILE_SELECT,
  RELEASE_PAGE_SELECT,
} from '../../home-components/getPublishedReleaseContext'
import { buildProfilesByOwnerId, mapRelease } from '../../home-components/releaseData'
import type { ReleaseItem } from '../../home-components/types'
import { hasPublishedCommerceProducts } from '@/utilities/commerceProducts'

export const dynamic = 'force-dynamic'

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
    select: PROFILE_SELECT,
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
  const bandName = profile?.displayName || 'Artista'

  return {
    description: `Explora los álbumes/singles de ${bandName}.`,
    title: 'Lanzamientos',
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
    depth: 1,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    select: RELEASE_PAGE_SELECT,
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
  const releases = (pagesResult.docs as Page[])
    .map((page) => mapRelease(page, profilesByOwnerId))
    .filter((release): release is ReleaseItem => Boolean(release))

  const bandName = profile.displayName || 'Artista'
  const hasShop = await hasPublishedCommerceProducts({
    payload,
    profile: profile.id,
  })

  return (
    <div className="mx-auto max-w-4xl pb-4 pt-4 md:pb-12 md:pt-16 [&_p]:text-[13px]">
      <div className="container">
        <header className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Lanzamientos
          </h1>
          <p className="mt-4 text-sm text-[#777] dark:text-[#858c98]">
            Explora los álbumes/singles de {bandName}.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 pb-4 pt-4 text-[13px]">
            <Link
              href={`/${profile.slug}/bio`}
              className="inline-flex items-center font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
            >
              Bio
            </Link>
            {hasShop ? (
              <Link
                href={`/${profile.slug}/shop`}
                className="inline-flex items-center font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
              >
                Shop
              </Link>
            ) : null}
          </div>
        </header>

        <div className="mx-auto mt-4 max-w-[50rem]">
          {releases.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:gap-6 xl:grid-cols-4">
              {releases.map((release) => (
                <article className="w-full" key={release.id}>
                  <Link href={release.releaseHref}>
                    <div>
                      <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-lg">
                        {release.imageUrl ? (
                          <Image
                            alt={release.releaseTitle}
                            className="object-cover"
                            fill
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
            <p className="py-8 text-center text-sm text-[#777] dark:text-[#858c98]">
              Aún no hay lanzamientos publicados.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
