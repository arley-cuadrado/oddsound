import type { Biography, Media } from '@/payload-types'
import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { SocialMediaBlock } from '@/blocks/SocialMediaBlock/Component'
import { ArtistProfileHeader } from '@/components/ArtistProfileHeader'
import { Media as MediaComponent } from '@/components/Media'
import { findPublicProfileBySlug } from '@/utilities/publicProfiles'
import { normalizePublicSlugParam } from '@/utilities/publicSlugs'
import { hasPublishedCommerceProducts } from '@/utilities/commerceProducts'
import { getProfileSocialLinks } from '@/utilities/profileSocialLinks'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

const PROFILE_BIO_SELECT = {
  displayName: true,
  genre: true,
  location: true,
  slug: true,
} as const

const BIOGRAPHY_SELECT = {
  hero: true,
  layout: true,
  socialLinks: true,
  title: true,
} as const

async function queryProfileBySlug(slug: string) {
  const payload = await getPayload({ config: configPromise })
  return findPublicProfileBySlug({ payload, slug })
}

async function queryBiographyByProfileID(profileID: string) {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'biographies',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    select: BIOGRAPHY_SELECT,
    where: {
      profile: {
        equals: profileID,
      },
    },
  })

  return result.docs[0] || null
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
    .map((profile) => ({
      slug: profile.slug as string,
    }))
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const profile = await queryProfileBySlug(normalizePublicSlugParam(slug))
  const displayName = profile?.displayName || 'Artista'

  return {
    description: `Conoce más sobre ${displayName}.`,
    title: `Bio de ${displayName}`,
  }
}

export default async function ArtistBioPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = normalizePublicSlugParam(slug)
  const profile = await queryProfileBySlug(decodedSlug)

  if (!profile) {
    notFound()
  }

  if (profile.slug && profile.slug !== decodedSlug) {
    permanentRedirect(`/${profile.slug}/bio`)
  }

  const payload = await getPayload({ config: configPromise })
  const [biography, socialLinks, hasShop] = await Promise.all([
    queryBiographyByProfileID(profile.id),
    getProfileSocialLinks({ payload, profileID: profile.id }),
    hasPublishedCommerceProducts({
      payload,
      profile: profile.id,
    }),
  ])
  const bioLayout: NonNullable<Biography['layout']> =
    biography && Array.isArray(biography.layout)
      ? (biography.layout as NonNullable<Biography['layout']>)
      : []
  const biographyHeroMedia =
    biography?.hero &&
    typeof biography.hero === 'object' &&
    biography.hero.media &&
    typeof biography.hero.media === 'object'
      ? (biography.hero.media as Media)
      : null

  return (
    <div className="artist-profile-surface">
      <ArtistProfileHeader
        eyebrow={
          <p className="artist-profile-meta text-[#777] dark:text-[#858c98]">
            {[profile.genre, profile.location].filter(Boolean).join(' · ')}
          </p>
        }
        media={
          biographyHeroMedia ? (
            <MediaComponent
              className="artist-profile-header__image"
              imgClassName="h-full w-full object-cover"
              priority
              resource={biographyHeroMedia}
            />
          ) : null
        }
        title={profile.displayName || biography?.title || 'Artista'}
        navigation={
          <>
            <Link
              href={`/${profile.slug}/releases`}
              className="inline-flex items-center rounded-full bg-[#23c7c9] px-4 py-2 text-[13px] font-medium text-white transition-transform hover:-translate-y-0.5"
            >
              Ver lanzamientos
            </Link>
            {hasShop ? (
              <Link
                href={`/${profile.slug}/shop`}
                className="artist-profile-nav-link"
              >
                Shop
              </Link>
            ) : null}
          </>
        }
      />

      <div className="artist-profile-content">
        {bioLayout.length > 0 ? (
          <RenderBlocks
            blocks={bioLayout as any}
            disableInnerContainer
            hiddenBlockTypes={['socialMediaBlock']}
            linkClassName="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
          />
        ) : biography ? (
          <p className="text-sm text-[#777] dark:text-[#858c98]">
            Esta biografía aún está en construcción.
          </p>
        ) : null}
      </div>
      <div className="artist-profile-social">
        <SocialMediaBlock socialLinks={socialLinks} />
      </div>
    </div>
  )
}
