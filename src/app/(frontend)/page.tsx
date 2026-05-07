import AsideHome from './home-components/AsideHome'
import SliderHeader from './home-components/HeaderHome'
import { Suspense } from 'react'

import ReleasesHomeSection from './home-components/ReleasesHomeSection'

export default async function HomePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex justify-center items-center h-auto">
        <div className="container flex flex-row gap-4">
          <SliderHeader />
        </div>
      </div>
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
