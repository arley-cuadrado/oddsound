'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect } from 'react'

type AuthUser = {
  role?: null | string
}

function updateCreatorNavLabels() {
  const profileLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/collections/profiles"]'))

  profileLinks.forEach((link) => {
    if (link.textContent?.trim() === 'Perfiles') {
      link.textContent = 'Perfil'
    }
  })
}

export default function CreatorNavLabelOverrides() {
  const { user } = useAuth<AuthUser>()

  useEffect(() => {
    if (user?.role !== 'creator') return

    updateCreatorNavLabels()

    const observer = new MutationObserver(() => {
      updateCreatorNavLabels()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [user?.role])

  return null
}
