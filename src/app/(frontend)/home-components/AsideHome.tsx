import { Footer } from '@/Footer/Component'
import { ArloSignature } from '../ArloSignature'
import { AboutUsTeaser } from '../about-us/AboutUsTeaser'

export default function AsideHome() {
  return (
    <>
      <aside className="gap-6 mb-7 pt-4 pb-4">
        <div className="w-70 px-6">
          <div>
            <h2 className="font-semibold tracking-tight text-pretty text-slate-700 dark:text-white">
              Binevenid@!
            </h2>
            <p className="mt-2 text-slate-600 dark:text-gray-400">
              Esta es una versión temprana del sitio, un espacio donde encontrarás artistas
              independientes.
            </p>
          </div>
          <div className="grid-cols-1 gap-x-8 gap-y-16 border-t border-gray-200 pt-10 sm:mt-10 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <div>
              <AboutUsTeaser />
              <div className="pb-8">
                <ArloSignature />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </aside>
    </>
  )
}
