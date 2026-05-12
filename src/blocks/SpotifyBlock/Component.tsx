import React from 'react'

import type { SpotifyBlock as SpotifyBlockProps } from '@/payload-types'
import { cn } from '@/utilities/ui'

type Props = SpotifyBlockProps & {
  disableInnerContainer?: boolean
}

const SPOTIFY_EMBED_TYPES = new Set(['album', 'artist', 'episode', 'playlist', 'show', 'track'])

function getSpotifyEmbedURL(spotify: string) {
  try {
    const parsedURL = new URL(spotify)
    const hostname = parsedURL.hostname.replace(/^www\./, '')

    if (hostname !== 'open.spotify.com') return null

    const segments = parsedURL.pathname.split('/').filter(Boolean)

    if (segments[0] === 'embed') {
      return `https://open.spotify.com/${segments.join('/')}`
    }

    const [type, id] = segments

    if (!type || !id || !SPOTIFY_EMBED_TYPES.has(type)) return null

    return `https://open.spotify.com/embed/${type}/${id}`
  } catch {
    if (!spotify.startsWith('spotify:')) return null

    const [, type, id] = spotify.split(':')

    if (!type || !id || !SPOTIFY_EMBED_TYPES.has(type)) return null

    return `https://open.spotify.com/embed/${type}/${id}`
  }
}

export const SpotifyBlock: React.FC<Props> = ({ disableInnerContainer, spotify }) => {
  const embedURL = getSpotifyEmbedURL(spotify)

  if (!embedURL) {
    return (
      <p className={cn('text-sm text-slate-500', { container: !disableInnerContainer })}>
        Invalid Spotify URL
      </p>
    )
  }

  return (
    <section className={cn('w-auto', { container: !disableInnerContainer })}>
      <iframe
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        className="w-full rounded-xl border-0"
        height="80"
        loading="lazy"
        src={embedURL}
        title="Spotify player"
      />
    </section>
  )
}
