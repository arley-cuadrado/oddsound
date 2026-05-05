import Link from 'next/link'
import Image from 'next/image'
import { Footer } from '@/Footer/Component'

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
            <article className="flex max-w-xl flex-col items-start justify-between">
              <div className="flex items-center gap-x-4 text-xs text-slate-600 dark:text-gray-400">
                <time dateTime="2020-03-16">Apr 17, 2026</time>
                {/*<Link href="/about-us" className="relative z-10 rounded-full bg-gray-50 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">CTO</Link>*/}
              </div>
              <Link href={'/about-us'}>
                <div className="group relative grow">
                  <h3 className="mt-3 text-lg/6 font-semibold text-slate-700 dark:text-white">
                    {/*<a href={'/about-us'}>*/}
                    <span className="absolute inset-0"></span>
                    Por qué Oddsound?
                    {/*</a>*/}
                  </h3>
                  <p className="mt-5 line-clamp-3 text-sm/6 text-slate-600 dark:text-gray-400">
                    Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo.
                    Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat
                    consectetur nulla deserunt vel. Iusto corrupti dicta.
                  </p>
                </div>
              </Link>
              <Link href="https://www.instagram.com/arlo_cuadrado/" target="_blank">
                <div className="relative mt-8 flex items-center gap-x-4 justify-self-end">
                  <Image
                    src="/home-images/arlo_cuadrado.png"
                    alt="Arlo Cuadrado"
                    width={40}
                    height={40}
                    className="size-10 rounded-full"
                  />
                  <div className="text-sm/6">
                    <div>
                      <p>
                        <span className="text-red title">@arlo_cuadrado</span>
                      </p>

                      <p className="text-slate-600 dark:text-gray-400 text-xs">
                        Founder / &quot;Content Creator&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          </div>
        </div>
        <Footer />
      </aside>
    </>
  )
}
