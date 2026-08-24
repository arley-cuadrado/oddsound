'use client'

import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const ScheduledPublishesNavLink: React.FC = () => {
  const { user } = useAuth<{ editorAccess?: boolean | null; role?: null | string; userType?: null | string }>()
  const pathname = usePathname()
  const href = '/dashboard#scheduled-publishes'
  const isActive = pathname === '/dashboard'
  const isFanUser = user?.userType === 'consumer' || user?.userType === 'fan'
  const canSeeLink =
    user?.role === 'admin' || (user?.role === 'creator' && !Boolean(user?.editorAccess) && !isFanUser)

  if (!canSeeLink) return null

  return (
    <div className="scheduled-publishes-nav-link">
      <Link
        className={isActive ? 'scheduled-publishes-nav-link__link is-active' : 'scheduled-publishes-nav-link__link'}
        href={href}
      >
        Publicaciones programadas
      </Link>
    </div>
  )
}

export default ScheduledPublishesNavLink
