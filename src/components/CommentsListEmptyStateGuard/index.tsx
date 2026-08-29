'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const COMMENTS_COLLECTION_PATH = '/dashboard/collections/comments'
const DEFAULT_EMPTY_MESSAGE = 'Aún no tienes comentarios por leer, invita a tus fans a comentar tus lanzamientos.'

export function isCommentsCollectionPath(pathname: string) {
  return pathname === COMMENTS_COLLECTION_PATH
}

export function getCommentsListEmptyStateMode(pathname: string, searchParams: URLSearchParams) {
  if (!isCommentsCollectionPath(pathname)) return 'ignore'

  const searchValue = searchParams.get('search')?.trim() || ''

  return searchValue.length === 0 ? 'default-empty' : 'search-empty'
}

function syncCommentsEmptyState(root: Document, pathname: string, searchParams: URLSearchParams) {
  const noResults = root.querySelector<HTMLElement>('.collection-list .no-results')
  if (!noResults) return

  const mode = getCommentsListEmptyStateMode(pathname, searchParams)
  if (mode === 'ignore') return

  if (!noResults.dataset.commentsEmptyStateOriginalHtml) {
    noResults.dataset.commentsEmptyStateOriginalHtml = noResults.innerHTML
  }

  if (mode === 'default-empty') {
    noResults.style.display = ''
    noResults.innerHTML = `<p>${DEFAULT_EMPTY_MESSAGE}</p>`
    return
  }

  const originalHTML = noResults.dataset.commentsEmptyStateOriginalHtml
  if (originalHTML) {
    noResults.innerHTML = originalHTML
  }

  noResults.style.display = ''
}

export default function CommentsListEmptyStateGuard() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isCommentsView = isCommentsCollectionPath(pathname)

  useEffect(() => {
    if (isCommentsView) {
      document.documentElement.dataset.commentsCollectionView = 'true'
    } else {
      delete document.documentElement.dataset.commentsCollectionView
    }

    return () => {
      delete document.documentElement.dataset.commentsCollectionView
    }
  }, [isCommentsView])

  useEffect(() => {
    if (!isCommentsView) return

    const syncCommentsListPresentation = () => {
      syncCommentsEmptyState(document, pathname, searchParams)
    }

    syncCommentsListPresentation()

    const target = document.querySelector('.collection-list')
    if (!target) return

    const observer = new MutationObserver(() => {
      syncCommentsListPresentation()
    })

    observer.observe(target, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [isCommentsView, pathname, searchParams])

  return null
}
