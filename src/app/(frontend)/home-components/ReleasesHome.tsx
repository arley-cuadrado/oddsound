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
              <section className="flex flex-col gap-4 pt-4 pb-4 items-start w-auto md:w-auto">
                <div className="overflow-hidden w-full">
                  <img
                    className="w-full"
                    src={release.imageUrl || '/home-images/hero.jpeg'}
                    alt={release.creatorName}
                  />
                </div>
                <div className="pr-8">
                  <p className="text-sm line-clamp-3 text-slate-500 dark:text-gray-400">
                    {release.description}
                  </p>
                  <div className="flex flex-wrap text-5 font-bold my-2 text-slate-700 dark:text-white">
                    <p>{release.creatorName}</p>
                    {release.country ? (
                      <p>
                        <span> , </span>
                        {release.country}
                      </p>
                    ) : null}
                  </div>
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
