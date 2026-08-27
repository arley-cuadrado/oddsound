'use client'

import { useNav } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const MOBILE_DASHBOARD_NAV_CLASS = 'mobile-dashboard-nav-default'

export default function AdminMobileNavDefault() {
  const pathname = usePathname()
  const { setNavOpen } = useNav()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isDashboardHome = pathname === '/dashboard'
    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches
    const shouldForceMobileNav = isDashboardHome && isMobileViewport

    document.body.classList.toggle(MOBILE_DASHBOARD_NAV_CLASS, shouldForceMobileNav)

    if (shouldForceMobileNav) {
      setNavOpen(true)
    }

    return () => {
      document.body.classList.remove(MOBILE_DASHBOARD_NAV_CLASS)
    }
  }, [pathname, setNavOpen])

  return null
}
