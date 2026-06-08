import type { Biography } from '@/payload-types'
import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound, permanentRedirect } from 'next/navigation'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { ShopBackButton } from '../shop/ShopBackButton'
import { findPublicProfileBySlug } from '@/utilities/publicProfiles'
import { normalizePublicSlugParam } from '@/utilities/publicSlugs'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

const PROFILE_BIO_SELECT = {
  displayName: true,
  slug: true,
} as const

const BIOGRAPHY_SELECT = {
  layout: true,
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

  const biography = await queryBiographyByProfileID(profile.id)

  if (!biography) {
    notFound()
  }

  const bioLayout = Array.isArray(biography.layout) ? (biography.layout as Biography['layout']) : []

  return (
    <div className="mx-auto max-w-4xl pb-24 pt-16 md:pt-20">
      <div className="container">
        <header className="mb-12 overflow-hidden rounded-none text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
          <div className="relative">
            <div className="relative grid gap-8 lg:items-end">
              <div className="grid gap-5">
                <ShopBackButton fallbackHref={`/${profile.slug}/releases`} label="BIO" />
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
                  {profile.displayName || biography.title || 'Artista'}
                </h1>
              </div>
            </div>
          </div>
        </header>

        {bioLayout && bioLayout.length > 0 ? (
          <RenderBlocks blocks={bioLayout as any} />
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <p className="text-[12px] uppercase tracking-[0.22em] text-[#777] dark:text-[#858c98]">
              Bio
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
              Esta biografía aún está en construcción
            </h2>
          </div>
        )}
      </div>
    </div>
  )
}
