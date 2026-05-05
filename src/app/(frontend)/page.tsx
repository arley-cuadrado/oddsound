import AsideHome from './home-components/AsideHome'
import SliderHeader from './home-components/HeaderHome'
import ReleasesHome from './home-components/ReleasesHome'
import type { Artist } from './home-components/types'

const mockArtists: Artist[] = [
  {
  id: 1,
    name: 'Juan Perez',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
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
  {
  id: 2,
    name: 'Carlos Martínez',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    musicGenre: 'Hip Hop',
    slug: 'carlosMartinez',
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
    <div className='mx-auto max-w-4xl'>
      <div className='flex justify-center items-center h-auto'>
        <div className='container flex flex-row gap-4'><SliderHeader /></div>
      </div>
      <main className="text-sm container">{/* justify-center w-auto h-screen  */} 
        <div className='flex flex-row'>
          <section className="pt-4 pb-4 w-150">
            <div className='w-auto'>{/* mx-auto max-w-5xl */}
              <ReleasesHome artists={mockArtists} />
            </div>
          </section>
          <AsideHome />
        </div>
      </main>
    </div>
  )
}
