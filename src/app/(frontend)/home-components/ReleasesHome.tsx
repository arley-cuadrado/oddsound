'use client'
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ReleaseItem } from './types'

const RELEASES_BATCH_SIZE = 5
const SPOTIFY_EMBED_TYPES = new Set(['album', 'artist', 'episode', 'playlist', 'show', 'track'])

function getSpotifyEmbedURL(spotify: string) {
  try {
    const parsedURL = new URL(spotify)
    const hostname = parsedURL.hostname.replace(/^www\./, '')

    if (hostname !== 'open.spotify.com') return null

    const segments = parsedURL.pathname.split('/').filter(Boolean)

    if (segments[0] === 'embed') {
      return `https://open.spotify.com/${segments.join('/')}?autoplay=1`
    }

    const [type, id] = segments

    if (!type || !id || !SPOTIFY_EMBED_TYPES.has(type)) return null

    return `https://open.spotify.com/embed/${type}/${id}?autoplay=1`
  } catch {
    if (!spotify.startsWith('spotify:')) return null

    const [, type, id] = spotify.split(':')

    if (!type || !id || !SPOTIFY_EMBED_TYPES.has(type)) return null

    return `https://open.spotify.com/embed/${type}/${id}?autoplay=1`
  }
}

export default function ReleasesHome({ releases }: { releases: ReleaseItem[] }) {
  const [visibleCount, setVisibleCount] = useState(RELEASES_BATCH_SIZE)
  const [activeSpotifyReleaseId, setActiveSpotifyReleaseId] = useState<string | null>(null)
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
        const spotifyEmbedURL = release.spotifyURL ? getSpotifyEmbedURL(release.spotifyURL) : null
        const isSpotifyVisible = activeSpotifyReleaseId === release.id

        return (
          <article key={release.id} className="w-full max-w-[28rem] max-[767.98px]:max-w-none">
            <section className="flex w-full flex-col items-start gap-2 pt-4 pb-4">
              <Link className="w-full" href={`/${release.releaseSlug}`}>
                <div className="relative h-[28rem] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-lg">
                  {release.imageUrl ? (
                    <img
                      className="h-full w-full object-cover"
                      src={release.imageUrl}
                      alt={release.creatorName}
                    />
                  ) : null}
                  {spotifyEmbedURL && !isSpotifyVisible ? (
                    <button
                      aria-label={`Play ${release.releaseTitle} on Spotify`}
                      className="absolute left-3 top-3 z-20 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black text-white transition hover:bg-slate-800"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setActiveSpotifyReleaseId(release.id)
                      }}
                      type="button"
                    >
                      <span aria-hidden="true" className="text-[9px] leading-none">
                        ▶
                      </span>
                    </button>
                  ) : null}
                  {spotifyEmbedURL && isSpotifyVisible ? (
                    <div className="absolute inset-x-3 top-3 z-10 opacity-75">
                      <iframe
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        className="w-full rounded-xl border-0"
                        height="80"
                        loading="lazy"
                        src={spotifyEmbedURL}
                        title={`${release.creatorName} Spotify player`}
                      />
                    </div>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-4 py-3 text-white">
                    <p className="text-sm text-white">
                      {release.creatorName}
                      {release.genre ? (
                        <span className="text-white/85"> · {release.genre}</span>
                      ) : null}
                    </p>
                    <p className="text-sm text-white">{release.country || 'Pais'}</p>
                  </div>
                </div>
                <div className="flex w-full flex-col pr-2">
                  <h3 className="text-[16px] font-black leading-tight text-slate-800 dark:text-white">
                    {release.releaseTitle}
                  </h3>
                  <p className="text-sm line-clamp-3 text-slate-500 dark:text-gray-400">
                    {release.description}
                  </p>
                </div>
              </Link>
            </section>
          </article>
        )
      })}

      {visibleCount < releases.length && <p className="text-center py-4">Loading more...</p>}
    </>
  )
}
