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
        : ['pages', 'biographies', 'products', 'profiles', 'media']

      // Find all collection links in the navigation
      const navLinks = Array.from(
        document.querySelectorAll<HTMLElement>('a[href*="/dashboard/collections/"]'),
      )

      navLinks.forEach((link) => {
        const href = link.getAttribute('href') || ''

        // Check if this link is for an allowed collection
        const isAllowed = allowedCollections.some((collection) => href.includes(`/collections/${collection}`))

        if (!isAllowed) {
          // Hide the entire parent list item
          const listItem = link.closest('li')
          if (listItem) {
            listItem.style.display = 'none'
          }
        }
      })

      // Also hide any non-collection admin sections
      const adminLinks = Array.from(document.querySelectorAll<HTMLElement>('a[href*="/dashboard"]'))
      adminLinks.forEach((link) => {
        const href = link.getAttribute('href') || ''
        const text = link.textContent?.toLowerCase() || ''

        // Hide links to collections that aren't in allowedCollections
        const isCollectionLink = href.includes('/dashboard/collections/')

        if (isCollectionLink) {
          const isAllowed = allowedCollections.some((collection) => href.includes(`/collections/${collection}`))
          if (!isAllowed) {
            const listItem = link.closest('li')
            if (listItem) {
              listItem.style.display = 'none'
            }
          }
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
