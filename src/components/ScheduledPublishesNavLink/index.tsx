'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const ScheduledPublishesNavLink: React.FC = () => {
  const pathname = usePathname()
  const href = '/dashboard#scheduled-publishes'
  const isActive = pathname === '/dashboard'

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
