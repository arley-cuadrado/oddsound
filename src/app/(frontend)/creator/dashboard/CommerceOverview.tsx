import Link from 'next/link'

import type { CommerceProductSummary } from '@/utilities/commerceProducts'
import { groupCommerceProductsByRelease } from '@/utilities/commerceProducts'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

type CommerceOverviewProps = {
  profileSlug?: null | string
  apiPath: string
  products: CommerceProductSummary[]
}

export function CommerceOverview({ apiPath, products, profileSlug }: CommerceOverviewProps) {
  const groupedProducts = groupCommerceProductsByRelease(products)

  return (
    <section className="space-y-6 rounded-[28px] border border-border/70 bg-white/70 p-6 shadow-[0_18px_60px_rgba(49,46,46,0.08)] backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/55">
            Commerce Hidden Layer
          </p>
          <h2 className="text-xl font-medium text-foreground">Catalogo remoto listo para pruebas</h2>
          <p className="max-w-[42rem] text-[13px] leading-6 text-foreground/75">
            Esta vista consume la misma capa de lectura del commerce oficial que ya puedes usar
            desde remoto, sin abrir aun la tienda publica.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-[12px] text-foreground/70">
            <span className="font-medium text-foreground">Endpoint interno:</span> {apiPath}
          </div>
          <Link
            className="inline-flex items-center rounded-2xl border border-border/70 bg-background px-4 py-3 text-[12px] font-medium text-foreground transition hover:bg-[#f3efe8]"
            href="/dashboard/collections/products"
          >
            Gestionar productos en Payload
          </Link>
          {profileSlug ? (
            <Link
              className="inline-flex items-center rounded-2xl border border-border/70 bg-background px-4 py-3 text-[12px] font-medium text-foreground transition hover:bg-[#f3efe8]"
              href={`/${profileSlug}/shop`}
            >
              Abrir shop publico
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border/70 bg-background px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/55">Productos</p>
          <p className="mt-2 text-2xl font-medium text-foreground">{products.length}</p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-background px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/55">Releases con shop</p>
          <p className="mt-2 text-2xl font-medium text-foreground">
            {groupedProducts.filter((group) => group.release).length}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-background px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/55">Sin vincular</p>
          <p className="mt-2 text-2xl font-medium text-foreground">
            {groupedProducts.find((group) => !group.release)?.products.length || 0}
          </p>
        </article>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background px-5 py-6 text-[13px] leading-6 text-foreground/75">
          Aun no hay productos creados para este perfil. El siguiente paso puede ser sembrar uno
          desde Payload o conectar esta misma capa a una interfaz de gestion dedicada.
        </div>
      ) : (
        <div className="space-y-4">
          {groupedProducts.map((group) => {
            const releaseLabel = group.release?.title || group.release?.slug || 'Productos sin release'

            return (
              <article key={group.release?.id || 'unlinked'} className="rounded-2xl border border-border/70 bg-background p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-base font-medium text-foreground">{releaseLabel}</h3>
                    <p className="text-[12px] text-foreground/65">
                      {group.release ? 'Release vinculado al catalogo oculto.' : 'Productos aun no vinculados a un release.'}
                    </p>
                  </div>
                  <span className="text-[12px] font-medium text-foreground/70">
                    {group.products.length} producto{group.products.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  {group.products.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-border/60 bg-white px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {product.title || 'Untitled product'}
                          </p>
                          <p className="text-[12px] text-foreground/70">
                            Estado: {product.status || 'draft'}
                          </p>
                          {product.description ? (
                            <p className="max-w-[42rem] text-[12px] leading-5 text-foreground/70">
                              {product.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1 text-[12px] text-foreground/70 md:text-right">
                          <p>Actualizado: {formatDate(product.updatedAt)}</p>
                          <p>Precio base USD: {typeof product.priceInUSD === 'number' ? product.priceInUSD : 'N/D'}</p>
                          <p>Inventario: {typeof product.inventory === 'number' ? product.inventory : 'N/D'}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
                        {product.externalCheckoutURL ? (
                          <a
                            className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-foreground transition hover:bg-[#f3efe8]"
                            href={product.externalCheckoutURL}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {product.checkoutButtonLabel || 'Comprar'}
                          </a>
                        ) : null}
                        <Link
                          className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-foreground transition hover:bg-[#f3efe8]"
                          href={`/dashboard/collections/products/${product.id}`}
                        >
                          Abrir en Payload
                        </Link>
                        {product.profile?.slug ? (
                          <span className="inline-flex items-center rounded-full bg-[#f4efe6] px-3 py-1.5 text-foreground/75">
                            Perfil: {product.profile.slug}
                          </span>
                        ) : null}
                        {product.checkoutProvider ? (
                          <span className="inline-flex items-center rounded-full bg-[#f4efe6] px-3 py-1.5 text-foreground/75">
                            Checkout: {product.checkoutProvider}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
