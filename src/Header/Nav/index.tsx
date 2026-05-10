'use client'

import React from 'react'
import { ThemeSelector } from '@/providers/Theme/ThemeSelector'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []
  const isLoginLink = (label?: string | null, url?: string | null) => {
    const normalizedLabel = label?.toLowerCase() || ''
    const normalizedURL = url?.toLowerCase() || ''

    return (
      normalizedLabel.includes('log-in') ||
      normalizedLabel.includes('login') ||
      normalizedURL.includes('/login')
    )
  }
  const topNavItems = navItems.filter(({ link }) => isLoginLink(link.label, link.url))

  return (
    <nav className="fixed top-0 left-0 z-30 flex h-dvh flex-col gap-4 p-4 max-[975px]:pointer-events-none max-[975px]:h-auto max-[975px]:w-full">
      <div className="max-[975px]:pointer-events-auto max-[975px]:fixed max-[975px]:top-0 max-[975px]:left-0 max-[975px]:z-30 max-[975px]:w-full max-[975px]:bg-white max-[975px]:px-4 max-[975px]:py-4 max-[975px]:dark:bg-[#0f0f0f]">
        <div className="max-[975px]:mx-auto max-[975px]:flex max-[975px]:max-w-4xl max-[975px]:items-center max-[975px]:justify-between">
          <Link href="/" className="title">
            {/*<Logo loading="eager" priority="high" className="invert dark:invert-0" />*/}
            <span className="font-black">odd</span>sound
          </Link>
          <div className="hidden max-[975px]:flex max-[975px]:items-center max-[975px]:gap-4">
            {topNavItems.map(({ link }, i) => {
              return (
                <CMSLink
                  key={i}
                  {...link}
                  appearance="inline"
                  className="block text-left hover:underline"
                />
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex h-[90vh] flex-col justify-between max-[975px]:pointer-events-auto max-[975px]:fixed max-[975px]:right-0 max-[975px]:bottom-0 max-[975px]:left-0 max-[975px]:z-30 max-[975px]:h-auto max-[975px]:w-full max-[975px]:flex-row max-[975px]:items-center max-[975px]:justify-between max-[975px]:gap-4 max-[975px]:bg-white max-[975px]:px-4 max-[975px]:py-4 max-[975px]:dark:bg-[#0f0f0f]">
        <div className="flex flex-col gap-4 max-[975px]:flex-row max-[975px]:items-center max-[975px]:gap-6">
          <Link href="/about-us" className="hidden">
            about
          </Link>
          <Link href="/search" className="flex hover:underline">
            <span className="block">Discover</span>
          </Link>
          {/* dynamic routes, registered artists */}
          {navItems.map(({ link }, i) => {
            return (
              <div
                key={i}
                className={`w-full text-left max-[975px]:w-auto ${
                  isLoginLink(link.label, link.url) ? 'max-[975px]:hidden' : ''
                }`}
              >
                <CMSLink
                  {...link}
                  appearance="inline"
                  className="block w-full text-left hover:underline max-[975px]:w-auto"
                />
              </div>
            )
          })}
        </div>
        <div className="hidden max-[975px]:block max-[975px]:shrink-0">
          <Link href="/about-us" className="block text-left hover:underline">
            about
          </Link>
        </div>
        <div className="max-[975px]:hidden max-[975px]:shrink-0">
          <ThemeSelector />
        </div>
      </div>
    </nav>
  )
}
