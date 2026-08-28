'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect } from 'react'

type AuthUser = {
  role?: null | string
}

const CREATOR_COLLECTION_LABELS: Record<string, string> = {
  biographies: 'Biografía',
  comments: 'Comentarios',
  media: 'Imágenes',
  pages: 'Lanzamientos',
  profiles: 'Perfil',
}

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
  const isCollectionLink = /\/dashboard\/collections\/[^/?#]+/.test(normalizedLinkPath)

  if (!isCollectionLink) {
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

export function getActiveCollectionInfo(currentPath: string) {
  const normalizedCurrentPath = normalizeCollectionPath(currentPath)
  const match = normalizedCurrentPath.match(/^\/dashboard\/collections\/([^/?#]+)/)
  const slug = match?.[1]

  if (!slug) return null

  const label = CREATOR_COLLECTION_LABELS[slug]
  if (!label) return null

  return {
    href: `/dashboard/collections/${slug}`,
    label,
    slug,
  }
}

export function ensureActiveCollectionNavItemLink(root: Document, currentPath: string) {
  const activeCollection = getActiveCollectionInfo(currentPath)
  if (!activeCollection) return false

  const navContent = root.querySelector('.nav-group__content')
  if (!navContent) return false

  const existingLink = navContent.querySelector<HTMLAnchorElement>(
    `a[href="${activeCollection.href}"]`,
  )

  if (existingLink) return false

  const activeTextElement = Array.from(navContent.querySelectorAll<HTMLElement>('*')).find(
    (element) =>
      element.textContent?.trim() === activeCollection.label &&
      !element.closest('a') &&
      !element.closest('button'),
  )

  if (!activeTextElement) return false

  const link = root.createElement('a')
  link.href = activeCollection.href
  link.textContent = activeCollection.label
  link.className = activeTextElement.className
  link.setAttribute('data-creator-mobile-collection-reset', activeCollection.slug)

  activeTextElement.replaceWith(link)
  return true
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

    const syncActiveCollectionLink = () => {
      if (!window.matchMedia('(max-width: 768px)').matches) return
      ensureActiveCollectionNavItemLink(document, window.location.pathname)
    }

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

    syncActiveCollectionLink()

    const observer = new MutationObserver(() => {
      syncActiveCollectionLink()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    document.addEventListener('click', handleClick, true)

    return () => {
      observer.disconnect()
      document.removeEventListener('click', handleClick, true)
    }
  }, [user?.role])

  return null
}
