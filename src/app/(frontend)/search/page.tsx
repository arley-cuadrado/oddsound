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
    <div className="mx-auto max-w-4xl pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none text-center">
          <h1>Discover</h1>
          <p className="mb-8 lg:mb-8">
            Explore music beyond the usual. Discover artists, releases, and scenes connected by
            genre, place, and identity.
          </p>

          <div className="max-w-[50rem] mx-auto">
            <Search />
          </div>
        </div>
      </div>

      {releases.length > 0 ? (
        <div className="container">
          <div className="grid grid-cols-4 gap-y-4 gap-x-4 lg:grid-cols-12 lg:gap-y-8 lg:gap-x-8">
            {releases.map((release) => (
              <article
                className="col-span-4 overflow-hidden border border-border bg-card"
                key={release.slug}
              >
                <Link href={`/${release.slug}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={release.title}
                    className="aspect-square h-full w-full object-cover"
                    src={release.imageUrl}
                  />
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">
                      {release.country}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-800 dark:text-white">
                      {release.title}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                      {release.creatorName}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="container">No release found.</div>
      )}
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `ODDSOUND Release Search`,
  }
}
