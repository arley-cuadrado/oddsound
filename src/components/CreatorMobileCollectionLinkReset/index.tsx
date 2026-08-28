'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect } from 'react'

type AuthUser = {
  role?: null | string
}

const FORCE_RESET_COLLECTIONS = new Set(['pages', 'media'])

export function normalizeCollectionPath(path: string) {
  const pathname = path.split('?')[0]?.split('#')[0] || '/'

  if (pathname.length > 1) {
    return pathname.replace(/\/+$/, '')
  }

  return pathname
}

export function shouldForceCollectionNavigation(currentPath: string, linkPath: string) {
  const normalizedCurrentPath = normalizeCollectionPath(currentPath)
  const normalizedLinkPath = normalizeCollectionPath(linkPath)
  const collectionSlug =
    normalizedLinkPath.match(/\/dashboard\/collections\/([^/?#]+)/)?.[1] || null

  if (!collectionSlug || !FORCE_RESET_COLLECTIONS.has(collectionSlug)) {
    return false
  }

  return (
    normalizedCurrentPath === normalizedLinkPath ||
    normalizedCurrentPath.startsWith(`${normalizedLinkPath}/`)
  )
}

export function forceCollectionNavigation(href: string) {
  window.location.assign(href)
}

type HandleCollectionLinkResetClickArgs = {
  currentPath: string
  isMobile: boolean
  navigate?: (href: string) => void
  target: EventTarget | null
}

export function handleCollectionLinkResetClick({
  currentPath,
  isMobile,
  navigate = forceCollectionNavigation,
  target,
}: HandleCollectionLinkResetClickArgs) {
  if (!isMobile) return false
  if (!(target instanceof Element)) return false

  const link = target.closest<HTMLAnchorElement>('a[href*="/dashboard/collections/"]')
  if (!link) return false

  if (!shouldForceCollectionNavigation(currentPath, link.pathname || '')) {
    return false
  }

  navigate(link.href)
  return true
}

export default function CreatorMobileCollectionLinkReset() {
  const { user } = useAuth<AuthUser>()

  useEffect(() => {
    if (user?.role !== 'creator') return
    if (typeof window === 'undefined') return

    const handleClick = (event: MouseEvent) => {
      const handled = handleCollectionLinkResetClick({
        currentPath: window.location.pathname,
        isMobile: window.matchMedia('(max-width: 768px)').matches,
        target: event.target,
      })

      if (!handled) return

      event.preventDefault()
      event.stopPropagation()
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [user?.role])

  return null
}
