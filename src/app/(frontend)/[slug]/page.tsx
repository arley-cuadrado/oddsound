import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import React, { cache } from 'react'
import { homeStatic } from '@/endpoints/seed/home-static'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { RELEASE_PAGE_SELECT } from '../home-components/getPublishedReleaseContext'

export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') {
    // In local dev this query slows the first render of dynamic artist pages a lot.
    return []
  }

  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    draft: false,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = pages.docs
    ?.filter((doc) => {
      return doc.slug !== 'home'
    })
    .map(({ slug }) => {
      return { slug }
    })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

async function creatorHasBiography(profileID: string) {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'biographies',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    select: {
      id: true,
    },
    where: {
      profile: {
        equals: profileID,
      },
    },
  })

  return result.docs.length > 0
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/' + decodedSlug
  let page: RequiredDataFromCollectionSlug<'pages'> | null

  page = await queryPageBySlug({
    slug: decodedSlug,
  })

  // Remove this code once your website is seeded
  if (!page && slug === 'home') {
    page = homeStatic
  }

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = page
  const creatorProfile = typeof page.profile === 'object' && page.profile ? page.profile : null
  const artistLayout = Array.isArray(layout)
    ? layout.filter((block) => block.blockType !== 'formBlock')
    : []
  const hasBiography = creatorProfile?.id ? await creatorHasBiography(String(creatorProfile.id)) : false

  return (
    <article className="mx-auto max-w-4xl pb-0 [&_p]:text-[13px]">
      <PageClient />
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <RenderHero
        {...hero}
        creatorCountry={creatorProfile?.location || undefined}
        creatorGenre={creatorProfile?.genre || undefined}
        creatorName={creatorProfile?.displayName || undefined}
        pageTitle={page.title}
      />
      {creatorProfile?.slug ? (
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 px-4 pb-6 pt-6 md:px-0">
          <Link
            href={`/${creatorProfile.slug}/releases`}
            className="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
          >
            Ver lanzamientos
          </Link>
          {hasBiography ? (
            <Link
              href={`/${creatorProfile.slug}/bio`}
              className="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
            >
              Bio
            </Link>
          ) : null}
          {creatorProfile.shopEnabled ? (
            <Link
              href={`/${creatorProfile.slug}/shop`}
              className="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
            >
              shop
            </Link>
          ) : null}
        </div>
      ) : null}
      <RenderBlocks blocks={artistLayout} />
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const page = await queryPageBySlug({
    slug: decodedSlug,
  })

  return generateMeta({ doc: page })
}

const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    depth: 1,
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    select: RELEASE_PAGE_SELECT,
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        ...(!draft
          ? [
              {
                _status: {
                  equals: 'published',
                },
              },
            ]
          : []),
      ],
    },
  })

  return result.docs?.[0] || null
})
