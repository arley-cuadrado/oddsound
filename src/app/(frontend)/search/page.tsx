import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import type { Media, Page, Profile } from '@/payload-types'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import Link from 'next/link'

import PageClient from './page.client'

type Args = {
  searchParams: Promise<{
    q: string
  }>
}

type SearchRelease = {
  country: string
  creatorName: string
  description: string
  genre: string
  imageUrl: string
  slug: string
  title: string
}

const FALLBACK_RELEASE_IMAGE = '/home-images/hero.jpeg'

function normalizeSearchValue(value: string) {
  // Normalize text so searches like "mexico" still match stored values like "México".
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function getProfileValue(profile: null | Profile | string | undefined) {
  if (!profile || typeof profile === 'string') return null

  return profile
}

function getOwnerId(page: Page) {
  if (!page.owner) return null
  if (typeof page.owner === 'string') return page.owner
  return page.owner.id
}

function getMediaUrl(media: Media | null | string | undefined) {
  if (!media || typeof media === 'string') return null

  const buildPublicMediaUrl = (filename: null | string | undefined) =>
    filename ? `/media/${filename}` : null

  return (
    buildPublicMediaUrl(media.sizes?.medium?.filename) ||
    buildPublicMediaUrl(media.sizes?.small?.filename) ||
    buildPublicMediaUrl(media.sizes?.thumbnail?.filename) ||
    buildPublicMediaUrl(media.filename) ||
    media.sizes?.medium?.url ||
    media.sizes?.small?.url ||
    media.sizes?.thumbnail?.url ||
    media.url ||
    null
  )
}

function extractRichTextText(
  node: null | {
    root?: {
      children?: unknown[]
    }
  },
) {
  if (!node?.root?.children) return ''

  const values: string[] = []

  const visit = (current: unknown) => {
    if (!current || typeof current !== 'object') return

    const candidate = current as { children?: unknown[]; text?: string }

    if (typeof candidate.text === 'string') {
      values.push(candidate.text)
    }

    if (Array.isArray(candidate.children)) {
      candidate.children.forEach(visit)
    }
  }

  node.root.children.forEach(visit)

  return values.join(' ').replace(/\s+/g, ' ').trim()
}

function mapSearchRelease(
  page: Page,
  profilesByOwnerId: Map<string, Profile>,
): SearchRelease | null {
  // Resolve the creator profile from the page first, then fall back to the owner relation.
  const profile = getProfileValue(page.profile) || profilesByOwnerId.get(getOwnerId(page) || '')

  if (!profile || !page.slug) return null

  const imageUrl =
    getMediaUrl(page.meta?.image as Media | null | string | undefined) ||
    getMediaUrl(page.hero?.media as Media | null | string | undefined) ||
    getMediaUrl(profile.coverImage as Media | null | string | undefined) ||
    getMediaUrl(profile.avatar as Media | null | string | undefined) ||
    FALLBACK_RELEASE_IMAGE

  return {
    country: profile.location || '',
    creatorName: profile.displayName || page.title,
    description:
      page.meta?.description?.trim() ||
      extractRichTextText(page.hero?.richText || null) ||
      profile.bio?.trim() ||
      page.title,
    // Search cards inherit the creator genre from the profile created at signup.
    genre: profile.genre?.trim() || '',
    imageUrl,
    slug: page.slug,
    title: page.title,
  }
}

export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q: rawQuery } = await searchParamsPromise
  const query = normalizeSearchValue(rawQuery || '')
  const payload = await getPayload({ config: configPromise })

  // The general frontend search intentionally queries only published creator release pages, never posts.
  const [pagesResult, profilesResult] = await Promise.all([
    payload.find({
      collection: 'pages',
      depth: 2,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      sort: '-publishedAt',
      where: {
        _status: {
          equals: 'published',
        },
      },
    }),
    payload.find({
      collection: 'profiles',
      depth: 1,
      limit: 100,
      overrideAccess: true,
      pagination: false,
    }),
  ])

  const profilesByOwnerId = new Map<string, Profile>()

  profilesResult.docs.forEach((profile) => {
    if (typeof profile.owner === 'object' && profile.owner?.id) {
      profilesByOwnerId.set(profile.owner.id, profile)
    }
  })

  const releases = pagesResult.docs
    .map((page) => mapSearchRelease(page, profilesByOwnerId))
    .filter((release): release is SearchRelease => Boolean(release))
    .filter((release) => {
      if (!query) return true

      // Match the discover input against genre, country, band/creator name, and album/release title.
      return [release.genre, release.country, release.creatorName, release.title].some((value) =>
        normalizeSearchValue(value).includes(query),
      )
    })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="prose dark:prose-invert max-w-none text-center">
            <h1>
              Discover the <strong className="title">odd</strong>
            </h1>
            <p className="mb-8 lg:mb-8">
              Explore music beyond the usual. Find artists, releases, and scenes connected by genre,
              place, and identity.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-[50rem]">
          <Search />

          {query ? (
            <div className="mt-12">
              {releases.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:gap-6 xl:grid-cols-4">
                  {releases.map((release) => (
                    <article className="w-full" key={release.slug}>
                      <Link href={`/${release.slug}`}>
                        <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={release.title}
                            className="h-full w-full object-cover"
                            src={release.imageUrl}
                          />
                          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 py-3 text-white sm:flex-row sm:items-end sm:justify-between sm:gap-3 md:px-4">
                            <p className="max-w-full text-xs leading-snug text-white sm:text-sm">
                              {release.creatorName}
                              {release.genre ? (
                                <span className="text-white/85"> · {release.genre}</span>
                              ) : null}
                            </p>
                            <p className="text-xs text-white sm:shrink-0 sm:text-sm">
                              {release.country || 'Country'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-12 text-center">No release found.</div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `ODDSOUND Release Search`,
  }
}
