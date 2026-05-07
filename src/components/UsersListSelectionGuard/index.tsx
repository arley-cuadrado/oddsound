'use client'

import { useEffect } from 'react'

export default function UsersListSelectionGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.pathname.includes('/admin/collections/users')) return

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
