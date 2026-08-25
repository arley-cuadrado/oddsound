import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { isAdminUser } from '@/utilities/isAdminUser'

export default async function EditorsNavLink() {
  const session = await getMeUser().catch(() => null)

  if (!isAdminUser(session?.user)) return null

  return (
    <div className="editors-nav-link">
      <p className="editors-nav-link__label">Usuarios</p>
      <Link
        className="editors-nav-link__link"
        href="/dashboard/collections/users?where[editorAccess][equals]=true&editors=1"
      >
        Editors
      </Link>
    </div>
  )
}
