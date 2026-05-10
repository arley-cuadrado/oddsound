'use client'

import React from 'react'
import { ThemeSelector } from '@/providers/Theme/ThemeSelector'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []

  return (
    <nav className="fixed top-0 left-0 flex h-dvh flex-col gap-4 p-4">
      <div>
        <Link href="/" className="title">
          {/*<Logo loading="eager" priority="high" className="invert dark:invert-0" />*/}
          <span className="font-black">odd</span>sound
        </Link>
      </div>
      <div className="flex h-[90vh] flex-col justify-between">
        <div className="flex flex-col gap-4">
          <Link href="/about-us" className="block md:hidden">
            about
          </Link>
          <Link href="/search" className="flex hover:underline">
            <span className="hidden md:block">Discover</span>
          </Link>
          {/* dynamic routes, registered artists */}
          {navItems.map(({ link }, i) => {
            return (
              <div key={i} className="w-full text-left">
                <CMSLink
                  {...link}
                  appearance="inline"
                  className="block w-full text-left hover:underline"
                />
              </div>
            )
          })}
        </div>
        <ThemeSelector />
      </div>
    </nav>
  )
}
