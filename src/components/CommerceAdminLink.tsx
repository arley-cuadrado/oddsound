'use client'
import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
export function CommerceAdminLink() {
  const { user } = useAuth()
  return user?.role === 'admin' ? (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <Link href="/dashboard/shop-register">Shop Register</Link>
      <Link href="/creator/commerce-admin">Liquidaciones, envíos y reclamos</Link>
    </div>
  ) : null
}
export default CommerceAdminLink
