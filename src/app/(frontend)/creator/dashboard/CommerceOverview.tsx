import Link from 'next/link'
import React from 'react'

import type { CommerceProductSummary } from '@/utilities/commerceProducts'
import { groupCommerceProductsByRelease } from '@/utilities/commerceProducts'
import { cn } from '@/utilities/ui'
import { PayoutSplitBar } from './PayoutSplitBar'
import { chip, panelCard, panelEyebrow, panelInset, panelTitle, secondaryButton, tone } from './ui'

type CommerceOverviewProps = {
  products: CommerceProductSummary[]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value))
}

/**
 * The artist's catalogue, grouped by the release each product belongs to.
 *
 * Every product shows what the artist actually takes home rather than only its
 * price, because the sticker price is not the number they care about.
 */
export function CommerceOverview({ products }: CommerceOverviewProps) {
  const grouped = groupCommerceProductsByRelease(products)
  const published = products.filter((product) => product.status === 'published').length

  return (
    <section className={cn(panelCard, 'space-y-5')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={panelEyebrow}>Catálogo</p>
          <h2 className={panelTitle}>Tu merch</h2>
          <p className="text-[12px] text-muted-foreground">
            {products.length} {products.length === 1 ? 'producto' : 'productos'} · {published}{' '}
            publicado{published === 1 ? '' : 's'}
          </p>
        </div>

        <Link className={secondaryButton} href="/dashboard/collections/products">
          Gestionar productos
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
          <p className="text-[14px] text-foreground">Todavía no tienes merch.</p>
          <p className="mx-auto mt-1 max-w-[32rem] text-[12px] leading-5 text-muted-foreground">
            Publica uno y aparece en tu shop.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <article className={panelInset} key={group.release?.id || 'unlinked'}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[14px] font-medium text-foreground">
                  {group.release?.title || 'Sin lanzamiento vinculado'}
                </h3>
                <span className="text-[12px] text-muted-foreground">
                  {group.products.length} {group.products.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>

              <ul className="mt-3 divide-y divide-border">
                {group.products.map((product) => (
                  <li
                    className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between"
                    key={product.id}
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-medium text-foreground">
                          {product.title || 'Producto sin título'}
                        </p>
                        <span
                          className={cn(
                            'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                            product.status === 'published'
                              ? cn(tone.ok, tone.okText)
                              : 'border-border bg-muted text-muted-foreground',
                          )}
                        >
                          {product.status === 'published' ? 'Publicado' : 'Borrador'}
                        </span>
                      </div>

                      {product.description ? (
                        <p className="max-w-[42rem] text-[12px] leading-5 text-muted-foreground">
                          {product.description}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className={chip}>
                          Inventario{' '}
                          {typeof product.inventory === 'number' ? product.inventory : '—'}
                        </span>
                        <span className={chip}>Editado {formatDate(product.updatedAt)}</span>
                        <Link
                          className={cn(chip, 'transition hover:bg-border')}
                          href={`/dashboard/collections/products/${product.id}`}
                        >
                          Editar
                        </Link>
                      </div>
                    </div>

                    <div className="w-full md:w-64 md:shrink-0">
                      <PayoutSplitBar compact priceInCOP={product.priceInCOP ?? null} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
