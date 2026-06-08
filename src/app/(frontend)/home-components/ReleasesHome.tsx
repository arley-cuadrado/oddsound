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
  const [animatedSpotifyReleaseId, setAnimatedSpotifyReleaseId] = useState<string | null>(null)
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

  useEffect(() => {
    if (!activeSpotifyReleaseId) {
      setAnimatedSpotifyReleaseId(null)
      return
    }

    setAnimatedSpotifyReleaseId(null)
    let frame: number | null = null

    const timeout = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        setAnimatedSpotifyReleaseId(activeSpotifyReleaseId)
      })
    }, 500)

    return () => {
      window.clearTimeout(timeout)

      if (frame !== null) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [activeSpotifyReleaseId])

  return (
    <div className="flex w-full min-w-0 flex-col items-start">
      {visibleReleases.map((release) => {
        const spotifyEmbedURL = release.spotifyURL ? getSpotifyEmbedURL(release.spotifyURL) : null
        const isSpotifyVisible = activeSpotifyReleaseId === release.id
        const isSpotifyAnimated = animatedSpotifyReleaseId === release.id

        return (
          <article key={release.id} className="w-full min-w-0 max-w-[28rem] max-[767.98px]:max-w-none">
            <section className="flex w-full flex-col items-start gap-2 pt-4 pb-4">
              <Link
                className="w-full"
                href={
                  release.creatorSlug
                    ? `/${release.creatorSlug}/release/${release.releaseSlug}`
                    : `/${release.releaseSlug}`
                }
              >
                <div className="relative h-[28rem] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-lg">
                  {release.imageUrl ? (
                    <img
                      className="h-full w-full object-cover"
                      src={release.imageUrl}
                      alt={release.creatorName}
                    />
                  ) : null}
                  {spotifyEmbedURL ? (
                    <div
                      className={`absolute inset-x-0 top-0 z-10 px-3 py-3 transition-opacity duration-300 ease-out ${
                        isSpotifyVisible ? 'pointer-events-none opacity-0' : 'opacity-100'
                      }`}
                    >
                      <button
                        aria-label={`Open ${release.releaseTitle} on Spotify`}
                        className="pointer-events-auto relative z-10 inline-flex h-6 touch-manipulation cursor-pointer items-center justify-center rounded-[16px] bg-white px-[10px] py-0 text-[10px] font-medium text-black transition hover:bg-slate-100"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setActiveSpotifyReleaseId(release.id)
                        }}
                        type="button"
                      >
                        <span aria-hidden="true" className="leading-none title">
                          Escucha
                        </span>
                      </button>
                    </div>
                  ) : null}
                  {spotifyEmbedURL ? (
                    <div
                      className={`absolute inset-x-3 top-3 z-10 h-[80px] transition-all duration-300 ease-out ${
                        isSpotifyAnimated
                          ? 'translate-y-0 opacity-75'
                          : 'pointer-events-none -translate-y-2 opacity-0'
                      }`}
                    >
                      {isSpotifyVisible ? (
                        <iframe
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          className="w-full rounded-xl border-0"
                          height="80"
                          loading="eager"
                          src={spotifyEmbedURL}
                          title={`${release.creatorName} Spotify player`}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-4 py-3 text-white">
                    <p className="text-sm text-white">
                      {release.creatorName}
                      {release.genre ? (
                        <span className="text-white/85"> · {release.genre}</span>
                      ) : null}
                    </p>
                    {release.country ? <p className="text-sm text-white">{release.country}</p> : null}
                  </div>
                </div>
                <div className="flex w-full flex-col pr-2">
                  <h3 className="mt-4 text-[13px] font-black leading-tight text-slate-800 dark:text-white">
                    {release.releaseTitle}
                  </h3>
                  <p className="line-clamp-3 text-[13px] text-[#777] dark:text-[#858c98]">
                    {release.description}
                  </p>
                </div>
              </Link>
            </section>
          </article>
        )
      })}

      {visibleCount < releases.length && <p className="w-full py-4 text-center">Loading more...</p>}
    </div>
  )
}
