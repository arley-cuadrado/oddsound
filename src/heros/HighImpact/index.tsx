'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'

type HighImpactHeroProps = Page['hero'] & {
  pageTitle: string
}

export const HighImpactHero: React.FC<HighImpactHeroProps> = ({ links, media, pageTitle }) => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('dark')
  })

  return (
    <div className="relative mt-0 overflow-hidden text-white" data-theme="dark">
      <div className="relative h-[400px] select-none">
        {media && typeof media === 'object' && (
          <Media fill imgClassName="-z-10 object-cover" priority resource={media} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/20 via-black/10 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_top,black_45%,transparent_100%)]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4">
        <div className="w-full max-w-4xl">
          <div className="px-5 pb-2 text-center md:px-8 md:pb-3">
            <h1 className="text-3xl font-black leading-none tracking-tight md:text-5xl lg:text-6xl">
              {pageTitle}
            </h1>
          </div>

          {Array.isArray(links) && links.length > 0 && (
            <ul className="pointer-events-auto mt-4 flex flex-wrap justify-center gap-4">
              {links.map(({ link }, i) => {
                return (
                  <li key={i}>
                    <CMSLink {...link} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
