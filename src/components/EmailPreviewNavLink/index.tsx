import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { isAdminUser } from '@/utilities/isAdminUser'

export default async function EmailPreviewNavLink() {
  const session = await getMeUser().catch(() => null)

  if (!isAdminUser(session?.user)) return null

  return (
    <div className="email-preview-nav-link">
      <p className="email-preview-nav-link__label">Marketing</p>
      <Link className="email-preview-nav-link__link" href="/dev/email-preview">
        Emails
      </Link>
    </div>
  )
}
