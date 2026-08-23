import type { ArtistFixture } from './artists'

const GENRES = [
  'Rock',
  'Cumbia',
  'Jazz',
  'Punk',
  'Electrónica',
  'Indie',
  'Folk',
  'Metal',
  'Hip Hop',
  'Ambient',
]

const COUNTRIES = [
  'Colombia',
  'México',
  'Argentina',
  'Chile',
  'España',
  'Perú',
  'Uruguay',
  'Bolivia',
  'Ecuador',
  'Costa Rica',
]

/**
 * Synthetic volume for `--stress`. Deterministic: index drives every value, so
 * repeated runs upsert the same documents instead of piling up new ones.
 */
export function buildStressArtists(artistCount = 20, releasesPerArtist = 6): ArtistFixture[] {
  return Array.from({ length: artistCount }, (_unused, artistIndex) => {
    const number = String(artistIndex + 1).padStart(2, '0')
    const slug = `carga-${number}`

    return {
      accountType: artistIndex % 2 === 0 ? 'band' : 'artist',
      bio: `Proyecto sintético número ${number}, generado para medir el volumen del catálogo.`,
      country: COUNTRIES[(artistIndex * 3) % COUNTRIES.length] as string,
      displayName: `Carga ${number}`,
      genre: GENRES[artistIndex % GENRES.length] as string,
      slug,
      releases: Array.from({ length: releasesPerArtist }, (_ignored, releaseIndex) => {
        const releaseNumber = String(releaseIndex + 1).padStart(2, '0')

        return {
          description: `Lanzamiento sintético ${releaseNumber} de Carga ${number}.`,
          slug: `${slug}-lanzamiento-${releaseNumber}`,
          spotify: 'https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy',
          title: `Carga ${number} · Lanzamiento ${releaseNumber}`,
        }
      }),
    }
  })
}
