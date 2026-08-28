'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect } from 'react'

type AuthUser = {
  editorAccess?: boolean | null
  id?: null | string
  role?: null | string
  userType?: null | string
}

export default function CreatorCollectionFilter() {
  const { user } = useAuth<AuthUser>()

  useEffect(() => {
    if (user?.role !== 'creator') return

    const hideCollectionsForCreators = () => {
      const isFanUser = user?.userType === 'consumer' || user?.userType === 'fan'
      const allowedCollections = isFanUser
        ? []
        : user?.editorAccess
        ? ['posts', 'profiles', 'media']
        : ['pages', 'biographies', 'profiles', 'media']
      const hiddenCollectionSlugs = ['products', 'carts', 'orders', 'transactions']
      const hiddenStandaloneLabels = ['publicaciones programadas']

      const hideNavElement = (element: HTMLElement | null) => {
        if (!element) return

        const container =
          element.closest<HTMLElement>('.nav-group') ||
          element.closest<HTMLElement>('li') ||
          element.closest<HTMLElement>('.scheduled-publishes-nav-link') ||
          element.closest<HTMLElement>('div')

        if (container) {
          container.style.display = 'none'
        }
      }

      // Find all collection links in the navigation
      const navLinks = Array.from(
        document.querySelectorAll<HTMLElement>('a[href*="/dashboard/collections/"]'),
      )

      navLinks.forEach((link) => {
        const href = link.getAttribute('href') || ''
        const isHiddenCollection = hiddenCollectionSlugs.some((collection) =>
          href.includes(`/collections/${collection}`),
        )

        // Check if this link is for an allowed collection
        const isAllowed = allowedCollections.some((collection) => href.includes(`/collections/${collection}`))

        if (isHiddenCollection || !isAllowed) {
          hideNavElement(link)
        }
      })

      // Also hide any non-collection admin sections or unfinished custom links.
      const adminLinks = Array.from(document.querySelectorAll<HTMLElement>('a[href*="/dashboard"]'))
      adminLinks.forEach((link) => {
        const href = link.getAttribute('href') || ''
        const text = link.textContent?.toLowerCase() || ''

        // Hide links to collections that aren't in allowedCollections
        const isCollectionLink = href.includes('/dashboard/collections/')

        if (isCollectionLink) {
          const isHiddenCollection = hiddenCollectionSlugs.some((collection) =>
            href.includes(`/collections/${collection}`),
          )
          const isAllowed = allowedCollections.some((collection) => href.includes(`/collections/${collection}`))
          if (isHiddenCollection || !isAllowed) {
            hideNavElement(link)
          }
        }

        const isHiddenStandaloneLink = hiddenStandaloneLabels.some((label) => text.includes(label))
        if (isHiddenStandaloneLink) {
          hideNavElement(link)
        }
      })

      const navGroups = Array.from(document.querySelectorAll<HTMLElement>('.nav-group'))
      navGroups.forEach((group) => {
        const label = group.querySelector<HTMLElement>('.nav-group__label')?.textContent?.trim().toLowerCase() || ''
        const visibleLinks = Array.from(group.querySelectorAll<HTMLElement>('a')).filter((link) => {
          const styles = window.getComputedStyle(link)
          return styles.display !== 'none' && styles.visibility !== 'hidden'
        })

        if (label === 'ecommerce' || visibleLinks.length === 0) {
          group.style.display = 'none'
        }
      })
    }

    // Run on initial load
    hideCollectionsForCreators()

    // Run on DOM changes
    const observer = new MutationObserver(() => {
      hideCollectionsForCreators()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [user?.editorAccess, user?.role, user?.userType])

  return null
}
