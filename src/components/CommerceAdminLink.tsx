'use client'
import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
export function CommerceAdminLink() {
  const { user } = useAuth()
  return user?.role === 'admin' ? (
    <Link href="/creator/commerce-admin">Liquidaciones, envíos y reclamos</Link>
  ) : null
}
export default CommerceAdminLink
