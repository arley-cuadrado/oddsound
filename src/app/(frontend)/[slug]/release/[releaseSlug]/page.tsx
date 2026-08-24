import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import { SocialMediaBlock } from '@/blocks/SocialMediaBlock/Component'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import React, { cache } from 'react'
import { permanentRedirect } from 'next/navigation'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import { hasPublishedCommerceProducts } from '@/utilities/commerceProducts'
import { findPublicProfileBySlug } from '@/utilities/publicProfiles'
import { normalizePublicSlugParam } from '@/utilities/publicSlugs'
import PageClient from '../../page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { RELEASE_PAGE_SELECT } from '../../../home-components/getPublishedReleaseContext'
import { ReleaseCommentsSection } from './ReleaseCommentsSection'

type Args = {
  params: Promise<{
    releaseSlug?: string
    slug?: string
  }>
}

const queryReleaseByProfileAndSlug = cache(
  async ({ profileSlug, releaseSlug }: { profileSlug: string; releaseSlug: string }) => {
    const { isEnabled: draft } = await draftMode()
    const payload = await getPayload({ config: configPromise })
    const profile = await findPublicProfileBySlug({ payload, slug: profileSlug })

    if (!profile?.id) {
      return { page: null, profile: null }
    }

    const profileOwnerID =
      typeof profile.owner === 'string' || typeof profile.owner === 'number'
        ? profile.owner
        : profile.owner && typeof profile.owner === 'object' && 'id' in profile.owner
          ? profile.owner.id
          : null

    const result = await payload.find({
      collection: 'pages',
      depth: 1,
      draft,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      select: RELEASE_PAGE_SELECT,
      where: {
        and: [
          {
            or: [
              {
                profile: {
                  equals: profile.id,
                },
              },
              ...(profileOwnerID
                ? [
                    {
                      owner: {
                        equals: profileOwnerID,
                      },
                    },
                  ]
                : []),
            ],
          },
          {
            slug: {
              equals: releaseSlug,
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

    return {
      page: (result.docs?.[0] as RequiredDataFromCollectionSlug<'pages'> | null) || null,
      profile,
    }
  },
)

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    depth: 1,
    draft: false,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: RELEASE_PAGE_SELECT,
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  return pages.docs.flatMap((page) => {
    const profile =
      page.profile && typeof page.profile === 'object' && typeof page.profile.slug === 'string'
        ? page.profile
        : null

    if (!profile?.slug || !page.slug) {
      return []
    }

    return [
      {
        releaseSlug: page.slug,
        slug: profile.slug,
      },
    ]
  })
}

export default async function ReleaseDetailPage({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { releaseSlug = '', slug = '' } = await paramsPromise
  const decodedProfileSlug = normalizePublicSlugParam(slug)
  const decodedReleaseSlug = normalizePublicSlugParam(releaseSlug)
  const url = `/${decodedProfileSlug}/release/${decodedReleaseSlug}`
  const { page, profile } = await queryReleaseByProfileAndSlug({
    profileSlug: decodedProfileSlug,
    releaseSlug: decodedReleaseSlug,
  })

  if (!page || !profile) {
    return <PayloadRedirects url={url} />
  }

  if (profile.slug && profile.slug !== decodedProfileSlug) {
    permanentRedirect(`/${profile.slug}/release/${decodedReleaseSlug}`)
  }

  if (page.slug && page.slug !== decodedReleaseSlug) {
    permanentRedirect(`/${profile.slug}/release/${page.slug}`)
  }

  const { hero, layout } = page
  const creatorProfile =
    typeof page.profile === 'object' && page.profile ? page.profile : profile
  const hasShop = creatorProfile?.id
    ? await hasPublishedCommerceProducts({
        payload: await getPayload({ config: configPromise }),
        profile: creatorProfile.id,
      })
    : false
  const artistLayout = Array.isArray(layout)
    ? layout.filter((block) => block.blockType !== 'formBlock')
    : []

  return (
    <article className="mx-auto max-w-4xl pb-0 [&_p]:text-[13px]">
      <PageClient />
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
          <Link
            href={`/${creatorProfile.slug}`}
            className="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
          >
            Bio
          </Link>
          {hasShop ? (
            <Link
              href={`/${creatorProfile.slug}/shop`}
              className="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
            >
              Shop
            </Link>
          ) : null}
        </div>
      ) : null}
      <RenderBlocks blocks={artistLayout} hiddenBlockTypes={['socialMediaBlock']} />
      {typeof page.id === 'string' && creatorProfile?.id ? (
        <ReleaseCommentsSection artistProfileId={String(creatorProfile.id)} releaseId={page.id} />
      ) : null}
      {Array.isArray(page.socialLinks) && page.socialLinks.length > 0 ? (
        <div className="px-4 pb-12 pt-6 md:px-0">
          <SocialMediaBlock socialLinks={page.socialLinks} />
        </div>
      ) : null}
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { releaseSlug = '', slug = '' } = await paramsPromise
  const { page } = await queryReleaseByProfileAndSlug({
    profileSlug: normalizePublicSlugParam(slug),
    releaseSlug: normalizePublicSlugParam(releaseSlug),
  })

  return generateMeta({ doc: page })
}
