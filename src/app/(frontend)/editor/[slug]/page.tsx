import type { Metadata } from 'next'

import { CollectionArchive } from '@/components/CollectionArchive'
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
  categories: true,
  meta: true,
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

  return result.docs as Pick<Post, 'categories' | 'meta' | 'slug' | 'title'>[]
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
    title: `${displayName} | Editor`,
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
    <div className="mx-auto max-w-4xl pb-4 pt-4 md:pb-12 md:pt-16">
      <div className="container space-y-8">
        <header className="space-y-6 border-b border-border pb-8">
          <div className="flex items-start gap-4">
            {profile.avatar && typeof profile.avatar === 'object' ? (
              <Media
                resource={profile.avatar}
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full"
                imgClassName="h-full w-full object-cover"
              />
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-full bg-muted" />
            )}

            <div className="min-w-0 space-y-1">
              <p className="text-sm text-[#777] dark:text-[#858c98]">Editor</p>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
                {profile.displayName}
              </h1>
              {socialLink ? (
                <a
                  href={socialLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
                >
                  {socialLink.label}
                </a>
              ) : null}
            </div>
          </div>

          {profile.bio?.trim() ? (
            <p className="max-w-3xl text-sm leading-7 text-[#777] dark:text-[#858c98]">
              {profile.bio}
            </p>
          ) : null}

          <p className="max-w-3xl text-sm leading-7 text-[#777] dark:text-[#858c98]">
            El editor es dueño de su artículo, oddosund como plataforma editorial presta su uso
            en colaboración.
          </p>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
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
            <CollectionArchive posts={posts} />
          ) : (
            <p className="text-sm text-[#777] dark:text-[#858c98]">
              Este editor aún no tiene artículos publicados.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
