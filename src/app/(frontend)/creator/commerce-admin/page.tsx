import { redirect } from 'next/navigation'
import { getMeUser } from '@/utilities/getMeUser'
import { isAdminUser } from '@/utilities/isAdminUser'
import { CommercePanel } from '@/components/CommercePanel'
export default async function CommerceAdminPage() {
  const { user } = await getMeUser({ nullUserRedirect: '/dashboard/login' })
  if (!isAdminUser(user)) redirect('/creator/dashboard')
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <CommercePanel mode="admin" />
    </main>
  )
}
