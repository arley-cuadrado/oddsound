import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Args = {
  params: Promise<{
    productId?: string
    slug?: string
  }>
  searchParams: Promise<{
    order?: string
    payment?: string
  }>
}

export default async function ShopCheckoutResultPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: Args) {
  const payload = await getPayload({ config: configPromise })
  const { slug = '' } = await paramsPromise
  const { order: orderID, payment } = await searchParamsPromise

  if (!orderID) {
    notFound()
  }

  const order = await payload
    .findByID({
      collection: 'orders',
      id: orderID,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)

  if (!order) {
    notFound()
  }

  const title =
    payment === 'success'
      ? 'Pago iniciado'
      : payment === 'failure'
        ? 'Pago rechazado'
        : 'Pago pendiente'

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-12">
      <section className="space-y-4 rounded-[28px] border border-border/70 bg-white/80 p-6 shadow-[0_18px_60px_rgba(49,46,46,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/55">
          Marketplace checkout
        </p>
        <h1 className="text-3xl font-medium text-foreground">{title}</h1>
        <p className="text-[13px] leading-6 text-foreground/75">
          Estado interno de la orden: {order.status || 'pending'} · Fulfillment:{' '}
          {(order as any).fulfillmentStatus || 'pending_payment'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#312e2e] px-5 text-[13px] font-medium text-white"
            href={`/${slug}/shop`}
          >
            Volver al shop
          </Link>
        </div>
      </section>
    </main>
  )
}
