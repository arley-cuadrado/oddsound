
'use client'
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Artist } from './types'

export default function ReleasesHome({ artists }: { artists: Artist[] }) {
  const [visibleCount, setVisibleCount] = useState(2)
  const visibleArtists = artists.slice(0, visibleCount)

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        setVisibleCount((prev) => prev + 2)
      }
    }

    window.addEventListener("scroll", handleScroll)

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
    {/*<h2 className="text-2xl font-semibold md:text-4xl">
        Releases
    </h2>*/}

      {visibleArtists.map((artist) => {
        const artistPhotoUrl =
          artist.photo.formats?.small?.url ||
          artist.photo.formats?.thumbnail?.url ||
          artist.photo.formats?.medium?.url ||
          artist.photo.url

        return (
          <article key={artist.id}>{/* className="hover:font-bold transition-all duration-300 gap-10 w-auto md:w-130 lg:w-130 " */}
            <Link href={`/artists/${artist.slug}`}>
              <section className="flex flex-col-reverse justify-between pt-4 pb-4 items-center w-auto md:w-auto">
                <div className="pr-8">
                  <p className="text-5 font-bold my-2 text-slate-700 dark:text-white">{artist.name}</p>
                  <p className="text-sm line-clamp-3 text-slate-500 dark:text-gray-400">{artist.description}</p>
                  <strong className="text-slate-500 dark:text-gray-400">{artist.musicGenre ? `#${artist.musicGenre}` : ''}</strong>
                </div>

                <div className="overflow-hidden">{/* w-auto md:w-32 h-24  */}
                  <img
                    className="w-full"
                    src={artistPhotoUrl || '/home-images/hero.jpeg'}
                    alt={artist.name}
                  />{/*  md:w-32 h-full object-cover */}
                </div>
              </section>
            </Link>
          </article>
        )
      })}

      {visibleCount < artists.length && (
        <p className="text-center py-4">Loading more...</p>
      )}
    </>
  )
}
