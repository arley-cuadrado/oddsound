import React from 'react'

import type { Page } from '@/payload-types'

import RichText from '@/components/RichText'

type LowImpactHeroType =
  | {
      children?: React.ReactNode
      creatorCountry?: string
      creatorGenre?: string
      creatorName?: string
      pageTitle: string
      richText?: never
    }
  | (Omit<Page['hero'], 'richText'> & {
      children?: never
      creatorCountry?: string
      creatorGenre?: string
      creatorName?: string
      pageTitle: string
      richText?: Page['hero']['richText']
    })

export const LowImpactHero: React.FC<LowImpactHeroType> = ({
  children,
  richText,
  pageTitle,
  creatorGenre,
  creatorCountry,
}) => {
  return (
    <div className="container od-top-gap px-4 md:px-6">
      <div className="max-w-[48rem]">
        {(creatorGenre || creatorCountry) && (
          <div className="mb-4 space-y-1">
            {(creatorGenre || creatorCountry) && (
              <p className="text-xs uppercase tracking-[0.14em] text-[#777] dark:text-[#858c98]">
                {[creatorGenre, creatorCountry].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}
        <h1 className="mb-6 text-3xl font-black leading-none tracking-tight text-slate-950 md:text-5xl lg:text-6xl dark:text-white">
          {pageTitle}
        </h1>
        {children || (richText && <RichText data={richText} enableGutter={false} />)}
      </div>
    </div>
  )
}
