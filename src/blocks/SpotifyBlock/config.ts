import type { Block } from 'payload'

const SPOTIFY_EMBED_TYPES = new Set(['album', 'artist', 'episode', 'playlist', 'show', 'track'])

function isValidSpotifyURL(value: null | string | undefined) {
  if (!value) return true

  try {
    const parsedURL = new URL(value)
    const hostname = parsedURL.hostname.replace(/^www\./, '')
    const segments = parsedURL.pathname.split('/').filter(Boolean)

    if (hostname !== 'open.spotify.com') return false
    if (segments[0] === 'embed') segments.shift()

    return Boolean(segments[0] && segments[1] && SPOTIFY_EMBED_TYPES.has(segments[0]))
  } catch {
    if (!value.startsWith('spotify:')) return false

    const [, type, id] = value.split(':')
    return Boolean(type && id && SPOTIFY_EMBED_TYPES.has(type))
  }
}

export const SpotifyBlock: Block = {
  slug: 'spotifyBlock',
  interfaceName: 'SpotifyBlock',
  labels: {
    plural: 'Spotify',
    singular: 'Spotify',
  },
  fields: [
    {
      name: 'spotify',
      type: 'text',
      label: 'Añadir URL de Spotify (Añade enlace de álbum o de un sencillo)',
      required: true,
      validate: (value: null | string | undefined) => {
        if (typeof value !== 'string' || !value.trim()) {
          return 'La URL de Spotify es obligatoria.'
        }

        if (!isValidSpotifyURL(value)) {
          return 'Ingresa una URL válida de artista, álbum, track, playlist, show o episodio de Spotify.'
        }

        return true
      },
    },
  ],
}
