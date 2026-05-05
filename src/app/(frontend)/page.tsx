import AsideHome from './home-components/AsideHome'
import HeaderHome from './home-components/HeaderHome'
import ReleasesHome from './home-components/ReleasesHome'
import type { Artist } from './home-components/types'

const mockArtists: Artist[] = [
  {
  id: 1,
    name: 'Juan Perez',
    description: 'test right here',
    musicGenre: 'Indi Rock',
    slug: 'juanPerez',
    photo: {
      url: '/home-images/hero.jpeg',
      formats: {
        thumbnail: { url: '/home-images/hero.jpeg' },
        small: { url: '/home-images/hero.jpeg' },
        medium: { url: '/home-images/hero.jpeg' },
      },
    },
  },
]

export default function HomePage() {
  return (
    <>
      <HeaderHome />
      <main className="flex h-screen flex-row items-center justify-center">
        <section className="px-6 py-16 md:px-10 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <ReleasesHome artists={mockArtists} />
          </div>
        </section>
        <AsideHome />
      </main>
    </>
  )
}
