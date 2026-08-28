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

      const navLinks = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a[href*="/dashboard/collections/"]'),
      )

      navLinks.forEach((link) => {
        const href = link.getAttribute('href') || ''
        const listItem = link.closest('li')

        if (!listItem) return

        const collectionSlug = href.match(/\/dashboard\/collections\/([^/?#]+)/)?.[1] || ''
        const isAllowed = allowedCollections.includes(collectionSlug)

        listItem.hidden = !isAllowed
        listItem.setAttribute('aria-hidden', String(!isAllowed))
        listItem.style.removeProperty('display')
      })
    }

    hideCollectionsForCreators()

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
