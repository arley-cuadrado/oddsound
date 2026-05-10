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
    <nav className="flex w-full justify-between">
      <div>
        <Link href="/" className="title">
          {/*<Logo loading="eager" priority="high" className="invert dark:invert-0" />*/}
          <span className="font-black">odd</span>sound
        </Link>
      </div>
      <div className="flex gap-6 items-center">
        <Link href="/about-us" className="block md:hidden">
          about
        </Link>
        <Link href="/search" className="flex">
          <SearchIcon className="w-auto text-primary" />
          <span className="hidden md:block">search</span>
        </Link>
        <ThemeSelector />
        {/* dynamic routes, registered artists */}
        {navItems.map(({ link }, i) => {
          return <CMSLink key={i} {...link} appearance="link" />
        })}
      </div>
    </nav>
  )
}
