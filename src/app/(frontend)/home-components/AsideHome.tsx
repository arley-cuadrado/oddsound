import { Footer } from '@/Footer/Component'
import { ArloSignature } from '../ArloSignature'
import { AboutUsTeaser } from '../about-us/AboutUsTeaser'

export default function AsideHome() {
  return (
    <>
      <aside className="gap-6 mb-7 pt-8 pb-4">
        <div className="w-70 px-6">
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight text-pretty text-black dark:text-white">
              Binevenid@!
            </h2>
            <p className="mt-2 text-[13px] text-[#777] dark:text-[#858c98]">
              Esta es una versión temprana del sitio, un espacio donde encontrarás artistas
              independientes.
            </p>
          </div>
          <div className="grid-cols-1 gap-x-8 gap-y-16 border-t border-gray-200 pt-10 sm:mt-10 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <div>
              <AboutUsTeaser />
              <div className="pb-6">
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
