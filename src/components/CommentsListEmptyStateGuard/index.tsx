'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const COMMENTS_COLLECTION_PATH = '/dashboard/collections/comments'

export function shouldHideCommentsEmptyState(pathname: string, searchParams: URLSearchParams) {
  if (pathname !== COMMENTS_COLLECTION_PATH) return false

  const searchValue = searchParams.get('search')?.trim() || ''

  return searchValue.length === 0
}

export default function CommentsListEmptyStateGuard() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const syncEmptyStateVisibility = () => {
      const noResults = document.querySelector<HTMLElement>('.collection-list .no-results')
      if (!noResults) return

      noResults.style.display = shouldHideCommentsEmptyState(pathname, searchParams) ? 'none' : ''
    }

    syncEmptyStateVisibility()

    const observer = new MutationObserver(() => {
      syncEmptyStateVisibility()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [pathname, searchParams])

  return null
}
