'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

type AuthUser = {
  id?: null | string
  role?: null | string
}

function updateCreatorNavLinks(profileHref?: string | null) {
  const profileLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/collections/profiles"]'))

  profileLinks.forEach((link) => {
    if (link.textContent?.trim() === 'Perfiles') {
      link.textContent = 'Perfil'
    }

    if (profileHref && link.getAttribute('href')?.includes('/dashboard/collections/profiles')) {
      link.setAttribute('href', profileHref)
    }
  })
}

export default function CreatorNavLabelOverrides() {
  const { user } = useAuth<AuthUser>()
  const [profileHref, setProfileHref] = useState<null | string>(null)

  useEffect(() => {
    if (user?.role !== 'creator') return

    let isMounted = true

    const loadProfileHref = async () => {
      if (!user?.id) return

      const params = new URLSearchParams({
        depth: '0',
        limit: '1',
      })

      params.set('where[owner][equals]', user.id)

      try {
        const response = await fetch(`/api/profiles?${params.toString()}`, {
          credentials: 'include',
        })

        if (!response.ok) return

        const data = (await response.json()) as {
          docs?: Array<{
            id?: string
          }>
        }

        const profileID = data.docs?.[0]?.id

        if (isMounted && profileID) {
          setProfileHref(`/dashboard/collections/profiles/${profileID}`)
        }
      } catch {
        // Keep the default collection link if the profile lookup fails.
      }
    }

    void loadProfileHref()

    return () => {
      isMounted = false
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    if (user?.role !== 'creator') return

    updateCreatorNavLinks(profileHref)

    const observer = new MutationObserver(() => {
      updateCreatorNavLinks(profileHref)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [profileHref, user?.role])

  return null
}
