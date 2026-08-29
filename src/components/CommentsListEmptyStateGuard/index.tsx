'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const COMMENTS_COLLECTION_PATH = '/dashboard/collections/comments'
const DEFAULT_EMPTY_MESSAGE = 'Aún no tienes comentarios por leer, invita a tus fans a comentar tus lanzamientos.'

export function getCommentsListEmptyStateMode(pathname: string, searchParams: URLSearchParams) {
  if (pathname !== COMMENTS_COLLECTION_PATH) return 'ignore'

  const searchValue = searchParams.get('search')?.trim() || ''

  return searchValue.length === 0 ? 'default-empty' : 'search-empty'
}

function hideCommentsListControls(root: Document) {
  const controls = Array.from(root.querySelectorAll<HTMLElement>('button, [role="button"]')).filter((element) => {
    const label = element.textContent?.trim()
    return label === 'Columnas' || label === 'Filtros'
  })

  controls.forEach((element) => {
    const container = element.closest<HTMLElement>('.btn--withPopup') || element.closest<HTMLElement>('.popup')
    ;(container || element).style.display = 'none'
  })
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

  useEffect(() => {
    const syncCommentsListPresentation = () => {
      hideCommentsListControls(document)
      syncCommentsEmptyState(document, pathname, searchParams)
    }

    syncCommentsListPresentation()

    const observer = new MutationObserver(() => {
      syncCommentsListPresentation()
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
