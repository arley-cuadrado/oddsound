import type { Metadata } from 'next'
import config from '@payload-config'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'

import type { Comment, Order, Product, Profile } from '@/payload-types'
import { SITE_NAME } from '@/seo/site'
import { getMeUser } from '@/utilities/getMeUser'
import { isFanUser } from '@/utilities/isEditorialUser'
import { resolveUserConsumerProfileID } from '@/utilities/userRelations'

export const metadata: Metadata = {
  title: `${SITE_NAME} Fan Account`,
  description: 'Consulta tus comentarios, compras y tracking dentro de Oddsound.',
  alternates: {
    canonical: '/fan/account',
  },
  robots: {
    follow: false,
    index: false,
  },
}

type CommentWithRelations = Comment & {
  artistProfile?: null | Pick<Profile, 'displayName' | 'id' | 'slug'>
  release?: null | Pick<any, 'id' | 'slug' | 'title'>
}

type OrderWithRelations = Order & {
  artistProfile?: null | Pick<Profile, 'displayName' | 'id' | 'slug'>
  items?:
    | {
        product?: null | Pick<Product, 'id' | 'title'>
        quantity: number
        id?: string | null
      }[]
    | null
  release?: null | Pick<any, 'id' | 'slug' | 'title'>
}

function formatDate(value?: null | string) {
  if (!value) return null

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatOrderStatus(value?: null | string) {
  switch (value) {
    case 'completed':
      return 'Completado'
    case 'processing':
      return 'En proceso'
    case 'cancelled':
      return 'Cancelado'
    case 'refunded':
      return 'Reembolsado'
    default:
      return value || 'Sin estado'
  }
}

function formatFulfillmentStatus(value?: null | string) {
  switch (value) {
    case 'pending_payment':
      return 'Pendiente de pago'
    case 'ready_to_ship':
      return 'Listo para envío'
    case 'shipped':
      return 'Enviado'
    case 'delivered':
      return 'Entregado'
    case 'not_required':
      return 'No requiere envío'
    case 'cancelled':
      return 'Cancelado'
    case 'refunded':
      return 'Reembolsado'
    default:
      return value || 'Sin estado'
  }
}

async function getFanComments(consumerProfileID: string) {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'comments',
    depth: 1,
    limit: 20,
    overrideAccess: true,
    pagination: false,
    sort: '-createdAt',
    where: {
      consumerProfile: {
        equals: consumerProfileID,
      },
    },
  })

  return result.docs as CommentWithRelations[]
}

async function getFanOrders(consumerProfileID: string) {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'orders',
    depth: 2,
    limit: 20,
    overrideAccess: true,
    pagination: false,
    sort: '-updatedAt',
    where: {
      consumerProfile: {
        equals: consumerProfileID,
      },
    },
  })

  return result.docs as OrderWithRelations[]
}

export default async function FanAccountPage() {
  const startedAt = Date.now()
  const { user } = await getMeUser({
    nullUserRedirect: '/fan/login',
  })

  if (!isFanUser(user)) {
    redirect('/search')
  }

  const consumerProfileID = resolveUserConsumerProfileID(user)

  if (!consumerProfileID) {
    redirect('/fan/login?auth=profile-missing')
  }

  const [comments, orders] = await Promise.all([
    getFanComments(consumerProfileID),
    getFanOrders(consumerProfileID),
  ])

  const trackedOrders = orders.filter(
    (order) => order.fulfillmentStatus && order.fulfillmentStatus !== 'pending_payment',
  )

  const payload = await getPayload({ config })
  payload.logger.info(
    {
      commentsCount: comments.length,
      durationMs: Date.now() - startedAt,
      ordersCount: orders.length,
      trackedOrdersCount: trackedOrders.length,
      userID: user.id,
    },
    'Fan account loaded.',
  )

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
      <div className="space-y-10">
          <header className="space-y-4 border-b border-border pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/55">
              Fan Account
            </p>
            <h1 className="text-3xl font-medium tracking-tight text-foreground md:text-5xl">
              Hola{user.name ? `, ${user.name}` : ''}.
            </h1>
            <p className="max-w-[44rem] text-[13px] leading-6 text-foreground/75">
              Aquí puedes ver tus comentarios, tus compras y el estado de tus pedidos dentro de
              Oddsound, sin exponer herramientas ni accesos de creador.
            </p>
          </header>

          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-foreground">Mis comentarios</h2>
              <p className="text-[13px] leading-6 text-foreground/75">
                Historial de comentarios hechos sobre lanzamientos dentro de Oddsound.
              </p>
            </div>

            {comments.length > 0 ? (
              <div className="space-y-5">
                {comments.map((comment) => {
                  const artistName =
                    comment.artistProfile && typeof comment.artistProfile === 'object'
                      ? comment.artistProfile.displayName
                      : null
                  const releaseTitle =
                    comment.release && typeof comment.release === 'object'
                      ? comment.release.title
                      : null
                  const releaseHref =
                    comment.artistProfile &&
                    typeof comment.artistProfile === 'object' &&
                    comment.artistProfile.slug &&
                    comment.release &&
                    typeof comment.release === 'object' &&
                    comment.release.slug
                      ? `/${comment.artistProfile.slug}/release/${comment.release.slug}`
                      : null

                  return (
                    <article
                      key={comment.id}
                      className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-foreground/60">
                        {artistName ? <span>{artistName}</span> : null}
                        {releaseTitle ? (
                          releaseHref ? (
                            <a className="underline underline-offset-2" href={releaseHref}>
                              {releaseTitle}
                            </a>
                          ) : (
                            <span>{releaseTitle}</span>
                          )
                        ) : null}
                        <span>
                          {comment.status === 'approved'
                            ? 'Publicado'
                            : 'Pendiente de revisión'}
                        </span>
                        <span>{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-[13px] leading-6 text-foreground/80">
                        {comment.content}
                      </p>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px] leading-6 text-foreground/75">
                Aún no has comentado ningún lanzamiento.
              </p>
            )}
          </section>

          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-foreground">Mis compras</h2>
              <p className="text-[13px] leading-6 text-foreground/75">
                Resumen de órdenes creadas desde tu cuenta de fan.
              </p>
            </div>

            {orders.length > 0 ? (
              <div className="space-y-5">
                {orders.map((order) => {
                  const artistName =
                    order.artistProfile && typeof order.artistProfile === 'object'
                      ? order.artistProfile.displayName
                      : null

                  return (
                    <article
                      key={order.id}
                      className="space-y-4 border-t border-border pt-4 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <p className="text-base font-medium text-foreground">
                            Orden {String(order.id).slice(0, 8)}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-foreground/60">
                            {artistName ? <span>{artistName}</span> : null}
                            {order.release &&
                            typeof order.release === 'object' &&
                            order.release.title ? (
                              <span>{order.release.title}</span>
                            ) : null}
                            <span>{formatDate(order.updatedAt)}</span>
                          </div>
                        </div>

                        <div className="space-y-1 text-[12px] text-foreground/70 md:text-right">
                          <p>Estado: {formatOrderStatus(order.status)}</p>
                          <p>Envío: {formatFulfillmentStatus(order.fulfillmentStatus)}</p>
                          <p>
                            Total:{' '}
                            {typeof order.amount === 'number'
                              ? `USD ${order.amount}`
                              : 'Sin total'}
                          </p>
                        </div>
                      </div>

                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-2">
                          {order.items.map((item) => {
                            const productTitle =
                              item.product && typeof item.product === 'object'
                                ? item.product.title
                                : 'Producto'

                            return (
                              <div
                                key={item.id || productTitle}
                                className="flex flex-wrap gap-3 text-[13px] text-foreground/75"
                              >
                                <span>{productTitle}</span>
                                <span>Cantidad: {item.quantity}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px] leading-6 text-foreground/75">
                Aún no tienes compras asociadas a tu cuenta.
              </p>
            )}
          </section>

          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-foreground">Tracking y estado</h2>
              <p className="text-[13px] leading-6 text-foreground/75">
                Seguimiento de pedidos físicos y estados de cumplimiento cuando estén disponibles.
              </p>
            </div>

            {trackedOrders.length > 0 ? (
              <div className="space-y-5">
                {trackedOrders.map((order) => (
                  <article
                    key={order.id}
                    className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-foreground/60">
                      <span>Orden {String(order.id).slice(0, 8)}</span>
                      <span>{formatFulfillmentStatus(order.fulfillmentStatus)}</span>
                      <span>{formatDate(order.updatedAt)}</span>
                    </div>
                    {order.carrierName ? (
                      <p className="text-[13px] leading-6 text-foreground/80">
                        Transportadora: {order.carrierName}
                      </p>
                    ) : null}
                    {order.trackingNumber ? (
                      <p className="text-[13px] leading-6 text-foreground/80">
                        Guía: {order.trackingNumber}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-[13px] leading-6 text-foreground/75">
              Aún no hay pedidos con tracking visible en tu cuenta.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
