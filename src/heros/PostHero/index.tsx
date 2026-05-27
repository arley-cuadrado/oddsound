'use client'
import React, { useEffect } from 'react'

import { useHeaderTheme } from '@/providers/HeaderTheme'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'
import { formatRelativePublishedAt } from '@/utilities/formatRelativePublishedAt'

export const PostHero: React.FC<{
  post: Post
}> = ({ post }) => {
  const { categories, heroImage, populatedAuthors, publishedAt, title } = post
  const { setHeaderTheme } = useHeaderTheme()

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''

  useEffect(() => {
    setHeaderTheme('dark')
  }, [setHeaderTheme])

  return (
    <div className="relative mt-8 overflow-hidden text-white container" data-theme="dark">
      <div className="relative h-[400px] select-none">
        {heroImage && typeof heroImage !== 'string' && (
          <Media fill imgClassName="-z-10 object-cover rounded-lg" priority resource={heroImage} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-[200px] bg-gradient-to-t from-black/20 via-black/10 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_top,black_45%,transparent_100%)] rounded-lg" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4">
        <div className="w-full max-w-4xl">
          <div className="px-5 pb-2 text-center md:px-8 md:pb-3">
            {categories?.length ? (
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-white/85">
                {categories
                  ?.map((category) =>
                    typeof category === 'object' && category !== null
                      ? (category.title || 'Untitled category')
                      : null,
                  )
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
            <h1 className="text-3xl font-black leading-none tracking-tight md:text-5xl lg:text-6xl">
              {title}
            </h1>

            <div className="pointer-events-auto mt-4 flex flex-col items-center gap-2 text-sm text-white/85 md:flex-row md:justify-center md:gap-6">
              {hasAuthors ? <p>{formatAuthors(populatedAuthors)}</p> : null}
              {publishedAt ? (
                <time dateTime={publishedAt}>Publicado: {formatRelativePublishedAt(publishedAt)}</time>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
