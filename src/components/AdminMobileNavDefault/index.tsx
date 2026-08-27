'use client'

import { useNav } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

const MOBILE_DASHBOARD_ROUTE_CLASS = 'mobile-dashboard-route'
const MOBILE_DASHBOARD_NAV_CLASS = 'mobile-dashboard-nav-default'

export default function AdminMobileNavDefault() {
  const pathname = usePathname()
  const { hydrated, navOpen, setNavOpen } = useNav()
  const previousPathnameRef = useRef(pathname)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isDashboardHome = pathname === '/dashboard'
    const isDashboardRoute = pathname.startsWith('/dashboard')
    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches
    const shouldApplyDashboardRouteClass = isDashboardRoute && isMobileViewport
    const shouldForceMobileNav = isDashboardHome && isMobileViewport

    document.body.classList.toggle(MOBILE_DASHBOARD_ROUTE_CLASS, shouldApplyDashboardRouteClass)
    document.body.classList.toggle(MOBILE_DASHBOARD_NAV_CLASS, shouldForceMobileNav)

    if (shouldForceMobileNav && hydrated && !navOpen) {
      setNavOpen(true)
    }

    const previousPathname = previousPathnameRef.current
    const navigatedFromDashboardHome =
      previousPathname === '/dashboard' && pathname !== '/dashboard' && pathname.startsWith('/dashboard')

    if (navigatedFromDashboardHome && hydrated && navOpen) {
      setNavOpen(false)
    }

    previousPathnameRef.current = pathname

    return () => {
      document.body.classList.remove(MOBILE_DASHBOARD_ROUTE_CLASS)
      document.body.classList.remove(MOBILE_DASHBOARD_NAV_CLASS)
    }
  }, [hydrated, navOpen, pathname, setNavOpen])

  return null
}
