'use client'

import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

type AuthUser = {
  role?: null | string
}

export default function EditorsNavLink() {
  const { user } = useAuth<AuthUser>()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (user?.role !== 'admin') return null

  const href = '/dashboard/collections/users?where[editorAccess][equals]=true&editors=1'
  const isActive =
    pathname === '/dashboard/collections/users' && searchParams.get('editors') === '1'

  return (
    <div className="editors-nav-link">
      <p className="editors-nav-link__label">Usuarios</p>
      <Link className={isActive ? 'editors-nav-link__link is-active' : 'editors-nav-link__link'} href={href}>
        Editors
      </Link>
    </div>
  )
}
