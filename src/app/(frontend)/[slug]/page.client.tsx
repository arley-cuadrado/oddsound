'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

const PageClient: React.FC = () => {
  /* Force the header to be dark mode while we have an image behind it */
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('light')

    const root = document.documentElement

    root.style.setProperty('--mobile-page-bottom-offset', '1.5rem')

    return () => {
      root.style.removeProperty('--mobile-page-bottom-offset')
    }
  }, [setHeaderTheme])
  return <React.Fragment />
}

export default PageClient
