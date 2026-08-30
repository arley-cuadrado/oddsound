import type { Metadata } from 'next'

import EditorialPostsList from '@/components/EditorialPostsList'
import { Media } from '@/components/Media'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'

import type { Post, Profile } from '@/payload-types'
import { findPublicProfileBySlug } from '@/utilities/publicProfiles'
import { normalizePublicSlugParam } from '@/utilities/publicSlugs'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

const EDITOR_POST_SELECT = {
  content: true,
  heroImage: true,
  profile: true,
  publishedAt: true,
  slug: true,
  title: true,
} as const

function getEditorialSocialLink(profile: Profile) {
  const label = profile.editorSocialLink?.label?.trim()
  const url = profile.editorSocialLink?.url?.trim()

  if (!label || !url) return null

  return { label, url }
}

async function queryEditorialProfileBySlug(slug: string) {
  const payload = await getPayload({ config: configPromise })
  const profile = await findPublicProfileBySlug({ payload, slug })

  if (!profile || profile.profileType !== 'editorial') {
    return null
  }

  return profile
}

async function queryEditorialPosts(profileID: string) {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 24,
    overrideAccess: true,
    pagination: false,
    select: EDITOR_POST_SELECT,
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
            equals: profileID,
          },
        },
      ],
    },
  })

  return result.docs as Pick<
    Post,
    'content' | 'heroImage' | 'profile' | 'publishedAt' | 'slug' | 'title'
  >[]
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
      profileType: true,
      slug: true,
    },
  })

  return profiles.docs
    .filter(
      (profile) =>
        profile.profileType === 'editorial' &&
        typeof profile.slug === 'string' &&
        profile.slug.trim().length > 0,
    )
    .map((profile) => ({
      slug: profile.slug as string,
    }))
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const profile = await queryEditorialProfileBySlug(normalizePublicSlugParam(slug))
  const displayName = profile?.displayName || 'Editor'

  return {
    description: `Lee los artículos y conoce el perfil editorial de ${displayName}.`,
    title: `${displayName} | Artículos`,
  }
}

export default async function EditorialProfilePage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = normalizePublicSlugParam(slug)
  const profile = await queryEditorialProfileBySlug(decodedSlug)

  if (!profile) {
    notFound()
  }

  if (profile.slug && profile.slug !== decodedSlug) {
    permanentRedirect(`/editor/${profile.slug}`)
  }

  const [posts, socialLink] = await Promise.all([
    queryEditorialPosts(profile.id),
    Promise.resolve(getEditorialSocialLink(profile)),
  ])

  return (
    <div className="mx-auto max-w-6xl pb-8 pt-6 md:pb-16 md:pt-10">
      <div className="container space-y-12">
        <header className="space-y-7 pb-8">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.28em] text-[#777] dark:text-[#858c98]">
              Editor
            </p>

            <div className="flex items-start gap-4 md:gap-6">
              {profile.avatar && typeof profile.avatar === 'object' ? (
                <Media
                  resource={profile.avatar}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#d9d9d9] md:h-16 md:w-16"
                  imgClassName="h-full w-full object-cover"
                />
              ) : null}
              {!profile.avatar || typeof profile.avatar === 'string' ? (
                <div className="h-14 w-14 shrink-0 rounded-full bg-[#d9d9d9] md:h-16 md:w-16" />
              ) : null}

              <div className="min-w-0 space-y-2">
                <h1 className="text-[2.75rem] font-black leading-none tracking-tight text-slate-900 dark:text-white md:text-[4.6rem]">
                  {profile.displayName}
                </h1>
                {socialLink ? (
                <a
                  href={socialLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="title inline-flex items-center text-[13px] font-medium text-[#d14d8b] underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  {socialLink.label}
                </a>
              ) : null}
            </div>
            </div>
          </div>

          {profile.bio?.trim() ? (
            <p className="max-w-4xl text-sm leading-7 text-[#777] dark:text-[#858c98]">
              {profile.bio}
            </p>
          ) : null}

        </header>

        <div className="border-t border-border" />

        <section className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[2rem] font-medium tracking-tight text-slate-900 dark:text-white">
              Artículos
            </h2>
            <Link
              href="/posts"
              className="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
            >
              Ver todos
            </Link>
          </div>

          {posts.length > 0 ? (
            <EditorialPostsList posts={posts} />
          ) : (
            <p className="text-sm text-[#b2b2b2] dark:text-[#858c98]">
              Este editor aún no tiene artículos publicados.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
