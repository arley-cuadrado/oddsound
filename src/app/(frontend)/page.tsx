import type { Metadata } from 'next'
import type { Media } from '@/payload-types'

import AsideHome from './home-components/AsideHome'
import SliderHeader from './home-components/HeaderHome'
import { Suspense } from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import ReleasesHomeSection from './home-components/ReleasesHomeSection'
import { getMediaResourceURL } from '@/utilities/getMediaUrl'
import { HOME_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/seo/site'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

const FALLBACK_SLIDER_IMAGE = '/home-images/hero.jpeg'
const LEGACY_MEDIA_API_SEGMENT = '/api/media/file/'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: mergeOpenGraph({
    description: HOME_DESCRIPTION,
    title: SITE_NAME,
    type: 'website',
    url: '/',
  }),
}

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  const featuredScenes = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 6,
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
    .map((post) => {
      const imageUrl =
        post.heroImage && typeof post.heroImage === 'object'
          ? getMediaResourceURL(post.heroImage as Media, post.heroImage.updatedAt)
          : null

      const safeImageUrl =
        !process.env.BLOB_READ_WRITE_TOKEN && imageUrl?.startsWith(LEGACY_MEDIA_API_SEGMENT)
          ? FALLBACK_SLIDER_IMAGE
          : (imageUrl ?? FALLBACK_SLIDER_IMAGE)

      return {
        id: post.id,
        imageUrl: safeImageUrl,
        slug: post.slug as string,
        title: post.title,
      }
    })

  return (
    <div className="od-page-shell mx-auto max-w-4xl">
      {sliderPosts.length > 0 ? (
        <div className="container px-4 py-0 md:px-6">
          <SliderHeader posts={sliderPosts} />
        </div>
      ) : null}
      <main className="text-sm container">
        <div className="flex flex-col justify-between md:flex-row">
          <section className="w-full min-w-0 pb-4 md:pr-24">
            <div className="w-full min-w-0">
              <Suspense
                fallback={
                  <p className="py-8 text-sm text-[#777] dark:text-[#858c98]">
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
