import { Suspense } from 'react'
import { CommercePanel } from '@/components/CommercePanel'
export const metadata = {
  title: 'Mis compras | Oddsound',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Suspense fallback={<p>Cargando compras…</p>}>
        <CommercePanel orderID={order} />
      </Suspense>
    </main>
  )
}
