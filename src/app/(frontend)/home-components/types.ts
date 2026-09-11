export interface ReleaseItem {
  id: string
  country: string
  creatorName: string
  description: string
  genre: string
  imageUrl: string | null
  publishedAt?: string | null
  releaseHref: string
  releaseTitle: string
  releaseSlug: string
  spotifyURL?: string | null
}
