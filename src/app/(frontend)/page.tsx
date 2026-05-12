import AsideHome from './home-components/AsideHome'
import SliderHeader from './home-components/HeaderHome'
import { Suspense } from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import ReleasesHomeSection from './home-components/ReleasesHomeSection'

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  const featuredScenes = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 8,
    overrideAccess: true,
    pagination: false,
    select: {
      heroImage: true,
      slug: true,
      title: true,
    },
    sort: '-publishedAt',
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  const sliderPosts = featuredScenes.docs
    .filter((post) => post.slug)
    .map((post) => ({
      id: post.id,
      imageUrl:
        post.heroImage && typeof post.heroImage === 'object' ? (post.heroImage.url ?? null) : null,
      slug: post.slug as string,
      title: post.title,
    }))

  return (
    <div className="mx-auto max-w-4xl">
      {sliderPosts.length > 0 ? (
        <div className="flex justify-center items-center h-auto">
          <div className="container flex flex-row gap-4">
            <SliderHeader posts={sliderPosts} />
          </div>
        </div>
      ) : null}
      <main className="text-sm container">
        {/* justify-center w-auto h-screen  */}
        <div className="flex justify-between">
          <section className="pt-4 pb-4 md:pr-24 pr-0">
            <div className="w-auto md:w-full">
              <Suspense
                fallback={
                  <p className="py-8 text-sm text-slate-500 dark:text-gray-400">
                    Loading releases...
                  </p>
                }
              >
                <ReleasesHomeSection />
              </Suspense>
            </div>
          </section>
          <aside className="hidden md:block">
            <AsideHome />
          </aside>
        </div>
      </main>
    </div>
  )
}
