'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import Link from 'next/link'
import React, { useEffect } from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'
import { formatRelativePublishedAt } from '@/utilities/formatRelativePublishedAt'

export const PostHero: React.FC<{
  post: Post
}> = ({ post }) => {
  const { setHeaderTheme } = useHeaderTheme()
  const { heroImage, populatedAuthors, profile, publishedAt, title } = post
  const editorialProfile = profile && typeof profile === 'object' ? profile : null
  const editorialProfileHref = editorialProfile?.slug ? `/editor/${editorialProfile.slug}` : null

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''

  useEffect(() => {
    setHeaderTheme('dark')
  })

  return (
    <div className="relative mt-4 overflow-hidden text-white container" data-theme="dark">
      <div className="relative h-[400px] select-none">
        {heroImage && typeof heroImage !== 'string' && (
          <Media fill imgClassName="-z-10 object-cover rounded-lg" priority resource={heroImage} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-[200px] bg-gradient-to-t from-black/20 via-black/10 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_top,black_45%,transparent_100%)] rounded-lg" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4">
        <div className="w-full max-w-4xl">
          <div className="px-5 pb-2 text-center md:px-8 md:pb-3">
            <h1 className="text-3xl font-black leading-none tracking-tight md:text-5xl lg:text-6xl">
              {title}
            </h1>

            <div className="pointer-events-auto mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-white/90">
              {editorialProfile ? (
                <>
                  {editorialProfileHref ? (
                    <Link
                      href={editorialProfileHref}
                      className="flex items-center gap-2 transition-opacity hover:opacity-80"
                    >
                      {editorialProfile.avatar && typeof editorialProfile.avatar === 'object' ? (
                        <Media
                          resource={editorialProfile.avatar}
                          className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/30"
                          imgClassName="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="h-7 w-7 shrink-0 rounded-full bg-white/75" />
                      )}
                      <span>{editorialProfile.displayName}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      {editorialProfile.avatar && typeof editorialProfile.avatar === 'object' ? (
                        <Media
                          resource={editorialProfile.avatar}
                          className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/30"
                          imgClassName="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="h-7 w-7 shrink-0 rounded-full bg-white/75" />
                      )}
                      <span>{editorialProfile.displayName}</span>
                    </div>
                  )}

                  {publishedAt ? <span aria-hidden="true">-</span> : null}
                </>
              ) : hasAuthors ? (
                <>
                  <p>{formatAuthors(populatedAuthors)}</p>
                  {publishedAt ? <span aria-hidden="true">-</span> : null}
                </>
              ) : null}

              {publishedAt ? (
                <time dateTime={publishedAt}>
                  Publicado: {formatRelativePublishedAt(publishedAt)}
                </time>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
