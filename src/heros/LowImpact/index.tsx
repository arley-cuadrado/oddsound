import React from 'react'

import type { Page } from '@/payload-types'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

type LowImpactHeroType =
  | {
      albumImage?: Page['hero']['albumImage']
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
  albumImage,
  children,
  richText,
  pageTitle,
  creatorName,
  creatorGenre,
  creatorCountry,
}) => {
  return (
    <div className="container mt-16 px-4 md:px-6">
      <div className="grid items-start gap-8 md:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] md:gap-12">
        {albumImage && typeof albumImage === 'object' ? (
          <div className="order-2 md:order-1">
            <Media
              className="overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900"
              imgClassName="h-full w-full object-cover rounded-lg"
              priority
              resource={albumImage}
            />
          </div>
        ) : null}

        <div className={albumImage && typeof albumImage === 'object' ? 'order-1 md:order-2' : 'max-w-[48rem]'}>
        {(creatorName || creatorGenre || creatorCountry) && (
          <div className="mb-4 space-y-1">
            {creatorName && (
              <p className="text-xs uppercase tracking-[0.14em] text-[#777] dark:text-[#858c98]">
                {creatorName}
              </p>
            )}
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
    </div>
  )
}
