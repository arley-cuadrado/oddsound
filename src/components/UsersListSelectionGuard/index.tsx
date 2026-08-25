'use client'

import { useEffect } from 'react'

export default function UsersListSelectionGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.pathname.includes('/dashboard/collections/users')) return

    const hideSelectionUI = () => {
      document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        const container =
          checkbox.closest('label') ||
          checkbox.closest('button') ||
          checkbox.closest('th') ||
          checkbox.closest('td') ||
          checkbox.parentElement

        if (container instanceof HTMLElement) {
          container.style.display = 'none'
        }
      })

      const isEditorsView = new URLSearchParams(window.location.search).get('editors') === '1'

      if (!isEditorsView) return

      document
        .querySelectorAll<HTMLAnchorElement>('a[href="/dashboard/collections/users/create"]')
        .forEach((link) => {
          const container = link.closest('a') || link.parentElement

          if (container instanceof HTMLElement) {
            container.style.display = 'none'
          }
        })
    }

    hideSelectionUI()

    const observer = new MutationObserver(() => {
      hideSelectionUI()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  return null
}
