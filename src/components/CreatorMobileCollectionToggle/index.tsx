'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect } from 'react'

type AuthUser = {
  role?: null | string
}

function normalizePath(path: string) {
  const pathname = path.split('?')[0]?.split('#')[0] || '/'

  if (pathname.length > 1) {
    return pathname.replace(/\/+$/, '')
  }

  return pathname
}

function isActiveCollectionPath(currentPath: string, linkPath: string) {
  return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`)
}

export default function CreatorMobileCollectionToggle() {
  const { user } = useAuth<AuthUser>()

  useEffect(() => {
    if (user?.role !== 'creator') return
    if (typeof window === 'undefined') return

    const handleClick = (event: MouseEvent) => {
      if (!window.matchMedia('(max-width: 768px)').matches) return

      const target = event.target
      if (!(target instanceof Element)) return

      const link = target.closest<HTMLAnchorElement>('a[href*="/dashboard/collections/"]')
      if (!link) return

      const navGroup = link.closest('.nav-group')
      if (!navGroup) return

      const linkPath = normalizePath(link.pathname || '')
      const currentPath = normalizePath(window.location.pathname)

      if (!isActiveCollectionPath(currentPath, linkPath)) return

      const toggleButton = navGroup.querySelector<HTMLButtonElement>('.nav-group__toggle')
      if (!toggleButton) return

      event.preventDefault()
      event.stopPropagation()
      toggleButton.click()
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [user?.role])

  return null
}
