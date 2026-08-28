'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const MOBILE_DASHBOARD_ROUTE_CLASS = 'mobile-dashboard-route'
const MOBILE_DASHBOARD_NAV_CLASS = 'mobile-dashboard-nav-default'

type MobileDashboardLink = {
  href: string
  key: string
  label: string
}

export default function AdminMobileNavDefault() {
  const pathname = usePathname()
  const [mobileLinks, setMobileLinks] = useState<MobileDashboardLink[]>([])
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isDashboardHome = pathname === '/dashboard'
  const shouldShowTrigger = isDashboardRoute && !isDashboardHome
  const overlayLinks = useMemo(
    () => mobileLinks.filter((link) => link.href !== pathname),
    [mobileLinks, pathname],
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches
    const shouldApplyDashboardRouteClass = isDashboardRoute && isMobileViewport
    const shouldForceMobileNav = isDashboardHome && isMobileViewport
    let frameID = 0

    const syncMobileLinks = () => {
      if (!shouldApplyDashboardRouteClass) {
        setMobileLinks([])
        return
      }

      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('aside.nav a.nav__link'))
        .filter((link) => {
          const href = link.getAttribute('href') || ''
          const label = link.textContent?.trim() || ''
          const styles = window.getComputedStyle(link)

          return (
            Boolean(href) &&
            Boolean(label) &&
            href.startsWith('/dashboard') &&
            styles.display !== 'none' &&
            styles.visibility !== 'hidden'
          )
        })
        .map((link) => ({
          href: link.getAttribute('href') || '',
          key: link.id || link.getAttribute('href') || link.textContent?.trim() || '',
          label: link.textContent?.trim() || '',
        }))

      setMobileLinks(links)
    }

    document.body.classList.toggle(MOBILE_DASHBOARD_ROUTE_CLASS, shouldApplyDashboardRouteClass)
    document.body.classList.toggle(MOBILE_DASHBOARD_NAV_CLASS, shouldForceMobileNav)
    syncMobileLinks()
    frameID = window.requestAnimationFrame(syncMobileLinks)
    setIsOverlayOpen(shouldForceMobileNav)

    return () => {
      window.cancelAnimationFrame(frameID)
      document.body.classList.remove(MOBILE_DASHBOARD_ROUTE_CLASS)
      document.body.classList.remove(MOBILE_DASHBOARD_NAV_CLASS)
    }
  }, [isDashboardHome, isDashboardRoute, pathname])

  if (!isDashboardRoute || mobileLinks.length === 0) return null

  return (
    <>
      {shouldShowTrigger ? (
        <button
          aria-controls="mobile-dashboard-nav-menu"
          aria-expanded={isOverlayOpen}
          className="mobile-dashboard-nav-trigger"
          onClick={() => setIsOverlayOpen((current) => !current)}
          type="button"
        >
          Menú
        </button>
      ) : null}
      {isOverlayOpen ? (
        <nav aria-label="Dashboard sections" className="mobile-dashboard-nav-menu" id="mobile-dashboard-nav-menu">
          <div className="mobile-dashboard-nav-menu__group">
            <p className="mobile-dashboard-nav-menu__label">Colecciones</p>
            <div className="mobile-dashboard-nav-menu__links">
              {overlayLinks.map((link) => (
                <a
                  key={link.key}
                  className="mobile-dashboard-nav-menu__link"
                  href={link.href}
                  onClick={() => setIsOverlayOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
      ) : null}
    </>
  )
}
