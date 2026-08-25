import React from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

type MediumImpactHeroProps = Page['hero'] & {
  creatorCountry?: string
  creatorGenre?: string
  creatorName?: string
  pageTitle: string
}

export const MediumImpactHero: React.FC<MediumImpactHeroProps> = ({
  links,
  media,
  pageTitle,
  creatorCountry,
  creatorGenre,
}) => {
  const creatorMeta = [creatorGenre, creatorCountry].filter(Boolean).join(' · ')

  return (
    <div className="container od-top-gap px-4 py-0 md:px-6">
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] md:gap-12">
        <div className="h-[272px] overflow-hidden md:h-[320px]">
          {media && typeof media === 'object' && (
            <Media
              className="h-full w-full overflow-hidden"
              imgClassName="h-full w-full object-cover rounded-lg"
              priority
              resource={media}
            />
          )}
        </div>

        <div className="flex flex-col justify-center">
          {creatorMeta && (
            <div className="mb-4 space-y-1">
              <p className="text-xs uppercase tracking-[0.14em] text-[#777] dark:text-[#858c98]">
                {creatorMeta}
              </p>
            </div>
          )}

          <h1 className="text-4xl font-black leading-[0.95] tracking-tight text-slate-950 md:text-6xl lg:text-7xl dark:text-white">
            {pageTitle}
          </h1>

          {Array.isArray(links) && links.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-4">
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

      {media && typeof media === 'object' && media?.caption && (
        <div className="mt-4 max-w-[42rem]">
          <RichText data={media.caption} enableGutter={false} />
        </div>
      )}
    </div>
  )
}
