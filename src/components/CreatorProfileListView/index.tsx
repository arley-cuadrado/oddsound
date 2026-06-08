'use client'

import { DefaultListView, useAuth } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ListViewClientProps } from 'payload'

type AuthUser = {
  id?: null | string
  role?: null | string
}

export default function CreatorProfileListView(props: ListViewClientProps) {
  const { user } = useAuth<AuthUser>()
  const router = useRouter()
  const [isResolvingProfile, setIsResolvingProfile] = useState(user?.role === 'creator')

  useEffect(() => {
    if (user?.role !== 'creator' || !user?.id) {
      setIsResolvingProfile(false)
      return
    }

    let isMounted = true

    const resolveProfile = async () => {
      const params = new URLSearchParams({
        depth: '0',
        limit: '1',
      })

      params.set('where[owner][equals]', user.id)

      try {
        const response = await fetch(`/api/profiles?${params.toString()}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          if (isMounted) setIsResolvingProfile(false)
          return
        }

        const data = (await response.json()) as {
          docs?: Array<{
            id?: string
          }>
        }

        const profileID = data.docs?.[0]?.id

        if (profileID) {
          router.replace(`/dashboard/collections/profiles/${profileID}`)
          return
        }
      } catch {
        // Fall through to the default list view if resolution fails.
      }

      if (isMounted) setIsResolvingProfile(false)
    }

    void resolveProfile()

    return () => {
      isMounted = false
    }
  }, [router, user?.id, user?.role])

  if (user?.role === 'creator') {
    return isResolvingProfile ? null : <DefaultListView {...props} />
  }

  return <DefaultListView {...props} />
}
