export interface Artist {
  id: number
  name: string
  description: string
  musicGenre: string
  slug: string
  photo: {
    url?: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
      medium?: { url: string }
    }
  }
}
