'use client'
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ReleaseItem } from './types'

const RELEASES_BATCH_SIZE = 5

export default function ReleasesHome({ releases }: { releases: ReleaseItem[] }) {
  const [visibleCount, setVisibleCount] = useState(RELEASES_BATCH_SIZE)
  const visibleReleases = releases.slice(0, visibleCount)

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        setVisibleCount((prev) => Math.min(prev + RELEASES_BATCH_SIZE, releases.length))
      }
    }

    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [releases.length])

  return (
    <>
      {visibleReleases.map((release) => {
        return (
          <article key={release.id}>
            <Link href={`/${release.releaseSlug}`}>
              <section className="flex flex-col gap-3 pt-4 pb-4 items-start w-auto md:w-auto">
                <div className="relative overflow-hidden w-full aspect-square bg-slate-100 dark:bg-slate-900">
                  <img
                    className="h-full w-full object-cover"
                    src={release.imageUrl || '/home-images/hero.jpeg'}
                    alt={release.creatorName}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-4 py-3 text-white">
                    <p className="text-sm font-semibold">{release.creatorName}</p>
                    <p className="text-sm">{release.country || 'Pais'}</p>
                  </div>
                </div>
                <div className="pr-8">
                  <h3 className="text-2xl font-semibold leading-tight text-slate-800 dark:text-white">
                    {release.releaseTitle}
                  </h3>
                  <p className="text-sm line-clamp-4 text-slate-500 dark:text-gray-400">
                    {release.description}
                  </p>
                </div>
              </section>
            </Link>
          </article>
        )
      })}

      {visibleCount < releases.length && <p className="text-center py-4">Loading more...</p>}
    </>
  )
}
