'use client'

import React, { useEffect, useState } from 'react'
import { ThemeSelector } from '@/providers/Theme/ThemeSelector'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isFanAuthenticated, setIsFanAuthenticated] = useState(false)
  const pathname = usePathname()
  const fallbackLoginLink = {
    label: 'Iniciar sesión',
    url: '/creator/login',
  }

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
        })

        if (!response.ok) {
          if (isMounted) {
            setIsAuthenticated(false)
            setIsFanAuthenticated(false)
          }
          return
        }

        const result = (await response.json()) as {
          user?: { id?: string | null; role?: null | string; userType?: null | string } | null
        }

        if (isMounted) {
          setIsAuthenticated(Boolean(result.user?.id))
          setIsFanAuthenticated(
            Boolean(result.user?.id) &&
              result.user?.role === 'creator' &&
              (result.user?.userType === 'consumer' || result.user?.userType === 'fan'),
          )
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false)
          setIsFanAuthenticated(false)
        }
      }
    }

    void checkSession()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/creator-api/logout', {
        credentials: 'include',
        method: 'POST',
      })
    } finally {
      window.location.href = isFanAuthenticated ? '/fan/login' : '/creator/login'
    }
  }

  const isLoginLink = (label?: string | null, url?: string | null) => {
    const normalizedLabel = label?.toLowerCase() || ''
    const normalizedURL = url?.toLowerCase() || ''

    return (
      normalizedLabel.includes('log-in') ||
      normalizedLabel.includes('login') ||
      normalizedURL.includes('/login')
    )
  }

  const getSafeLink = <T extends { label?: null | string; url?: null | string }>(link: T) => {
    if (!isLoginLink(link.label, link.url)) return link

    return {
      ...link,
      label: 'Iniciar sesión',
      url: '/creator/login',
    }
  }

  const topNavItems = navItems.filter(({ link }) => isLoginLink(link.label, link.url))
  const loginNavItems =
    topNavItems.length > 0 ? topNavItems : [{ link: fallbackLoginLink as typeof navItems[number]['link'] }]

  return (
    <nav
      className="fixed left-0 z-30 flex h-dvh flex-col gap-4 p-4 max-[975px]:pointer-events-none max-[975px]:h-auto max-[975px]:w-full"
      style={{ top: 'var(--admin-bar-offset, 0px)' }}
    >
      <div
        className="max-[975px]:pointer-events-auto max-[975px]:fixed max-[975px]:left-0 max-[975px]:z-30 max-[975px]:w-full max-[975px]:bg-white max-[975px]:px-4 max-[975px]:py-2 max-[975px]:dark:bg-[#0f0f0f]"
        style={{ top: 'var(--admin-bar-offset, 0px)' }}
      >
        <div className="max-[975px]:mx-auto max-[975px]:flex max-[975px]:max-w-4xl max-[975px]:items-center max-[975px]:justify-between">
          <Link href="/" className="title">
            {/*<Logo loading="eager" priority="high" className="invert dark:invert-0" />*/}
            <span className="font-black">odd</span>sound
          </Link>
          {!isAuthenticated ? (
            <div className="hidden max-[975px]:flex max-[975px]:items-center max-[975px]:gap-4">
              {loginNavItems.map(({ link }, i) => {
                return (
                  <CMSLink
                    key={i}
                    {...getSafeLink(link)}
                    appearance="inline"
                    className="block text-[13px] text-left hover:underline"
                  />
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex h-[90vh] flex-col justify-between max-[975px]:pointer-events-auto max-[975px]:fixed max-[975px]:right-0 max-[975px]:bottom-0 max-[975px]:left-0 max-[975px]:z-30 max-[975px]:h-auto max-[975px]:w-full max-[975px]:flex-row max-[975px]:items-center max-[975px]:justify-between max-[975px]:gap-4 max-[975px]:bg-white max-[975px]:px-4 max-[975px]:py-2 max-[975px]:dark:bg-[#0f0f0f]">
        <div className="flex flex-col gap-4 max-[975px]:flex-row max-[975px]:items-center max-[975px]:gap-6">
          <Link href="/about-us" className="hidden">
            about
          </Link>
          <Link href="/search" className="flex text-[13px] hover:underline">
            <span className="block">Discover</span>
          </Link>
          {isFanAuthenticated ? (
            <Link
              href="/fan/account"
              className={`flex text-[13px] hover:underline ${
                pathname === '/fan/account' ? 'underline underline-offset-4' : ''
              }`}
            >
              <span className="block">Mi cuenta</span>
            </Link>
          ) : null}
          {/* dynamic routes, registered artists */}
          {navItems.map(({ link }, i) => {
            return (
              <div
                key={i}
                className={`w-full text-left max-[975px]:w-auto ${
                  isLoginLink(link.label, link.url)
                    ? isAuthenticated
                      ? 'hidden'
                      : 'max-[975px]:hidden'
                    : ''
                }`}
              >
                <CMSLink
                  {...getSafeLink(link)}
                  appearance="inline"
                  className="block w-full text-[13px] text-left hover:underline max-[975px]:w-auto"
                />
              </div>
            )
          })}
          {!isAuthenticated && topNavItems.length === 0 ? (
            <div className="w-full text-left max-[975px]:hidden">
              <CMSLink
                {...fallbackLoginLink}
                appearance="inline"
                className="block w-full text-[13px] text-left hover:underline max-[975px]:w-auto"
              />
            </div>
          ) : null}
          {isFanAuthenticated ? (
            <button
              className="w-full text-left text-[13px] hover:underline max-[975px]:w-auto"
              onClick={handleLogout}
              type="button"
            >
              Cerrar sesión
            </button>
          ) : null}
        </div>
        <div className="hidden max-[975px]:block max-[975px]:shrink-0">
          <Link href="/about-us" className="block text-[13px] text-left hover:underline">
            Sobre Oddsound
          </Link>
        </div>
        <div className="max-[975px]:hidden max-[975px]:shrink-0">
          <ThemeSelector />
        </div>
      </div>
    </nav>
  )
}
