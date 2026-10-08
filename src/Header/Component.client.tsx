'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'

import type { Header } from '@/payload-types'

import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
  shoppingEnabled: boolean
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data, shoppingEnabled }) => {
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <header className="relative z-20" {...(headerTheme ? { 'data-theme': headerTheme } : {})}>
      <div className="py-8">
        <HeaderNav data={data} shoppingEnabled={shoppingEnabled} />
      </div>
    </header>
  )
}
