import type { Biography, Media, Page } from '@/payload-types'
import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { Media as MediaComponent } from '@/components/Media'
import { SocialMediaBlock } from '@/blocks/SocialMediaBlock/Component'
import { findPublicProfileBySlug } from '@/utilities/publicProfiles'
import { normalizePublicSlugParam } from '@/utilities/publicSlugs'
import { hasPublishedCommerceProducts } from '@/utilities/commerceProducts'

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
  title: true,
} as const

const RELEASE_SOCIAL_LINKS_SELECT = {
  layout: true,
  socialLinks: true,
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

async function queryProfileSocialLinksByProfileID(profileID: string) {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 50,
    overrideAccess: true,
    pagination: false,
    select: RELEASE_SOCIAL_LINKS_SELECT,
    sort: '-updatedAt',
    where: {
      profile: {
        equals: profileID,
      },
    },
  })

  return (result.docs.find(
    (page) => Array.isArray(page.socialLinks) && page.socialLinks.length > 0,
  ) || null) as null | Pick<Page, 'socialLinks'>
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

  const [biography, socialLinksSource] = await Promise.all([
    queryBiographyByProfileID(profile.id),
    queryProfileSocialLinksByProfileID(profile.id),
  ])
  const hasShop = await hasPublishedCommerceProducts({
    payload: await getPayload({ config: configPromise }),
    profile: profile.id,
  })
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
    <div className="mx-auto max-w-4xl pb-4 pt-4 md:pb-12">
      <div className="container">
        <header className="mb-4 overflow-hidden rounded-none text-white">
          <div className="relative grid gap-5">
            {biographyHeroMedia ? (
              <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] md:gap-12">
                <div className="h-[272px] overflow-hidden md:h-[320px]">
                  <MediaComponent
                    className="h-full w-full overflow-hidden"
                    imgClassName="h-full w-full object-cover rounded-lg"
                    priority
                    resource={biographyHeroMedia}
                  />
                </div>

                <div className="flex flex-col justify-center">
                  <div className="mb-4 space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#777] dark:text-[#858c98]">
                      BIO
                    </p>
                    {[profile.genre, profile.location].filter(Boolean).length > 0 ? (
                      <p className="text-xs uppercase tracking-[0.14em] text-[#777] dark:text-[#858c98]">
                        {[profile.genre, profile.location].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>

                  <h1 className="text-4xl font-black leading-[0.95] tracking-tight text-slate-950 md:text-6xl lg:text-7xl dark:text-white">
                    {profile.displayName || biography?.title || 'Artista'}
                  </h1>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {[profile.genre, profile.location].filter(Boolean).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#777] dark:text-[#858c98]">
                      BIO
                    </p>
                    {[profile.genre, profile.location].filter(Boolean).length > 0 ? (
                      <p className="text-xs uppercase tracking-[0.14em] text-[#777] dark:text-[#858c98]">
                        {[profile.genre, profile.location].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                )}
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
                  {profile.displayName || biography.title || 'Artista'}
                </h1>
              </div>
            )}
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-3">
          <Link
            href={`/${profile.slug}/releases`}
            className="inline-flex items-center rounded-full px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5"
            style={{
              background:
                'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab) 0 0 / 400% 400%',
            }}
          >
            Ver lanzamientos
          </Link>
          {hasShop ? (
            <Link
              href={`/${profile.slug}/shop`}
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-[13px] font-medium text-foreground shadow-sm transition hover:-translate-y-0.5"
            >
              Shop
            </Link>
          ) : null}
        </div>

        {bioLayout.length > 0 ? (
          <RenderBlocks
            blocks={bioLayout as any}
            disableInnerContainer
            hiddenBlockTypes={['socialMediaBlock']}
            linkClassName="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
          />
        ) : biography ? (
          <p className="mt-4 text-sm text-[#777] dark:text-[#858c98]">
            Esta biografía aún está en construcción.
          </p>
        ) : null}
      </div>
      <div className="pt-4 md:pt-6">
        <div className="container">
          {Array.isArray(socialLinksSource?.socialLinks) &&
          socialLinksSource.socialLinks.length > 0 ? (
            <SocialMediaBlock socialLinks={socialLinksSource.socialLinks} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
