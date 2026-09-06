import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import type { Profile } from '@/payload-types'
import { getMeUser } from '@/utilities/getMeUser'
import { listCommerceProducts, resolveUserProfileID } from '@/utilities/commerceProducts'
import { canAccessPayloadDashboard, isMusicalCreatorUser } from '@/utilities/isEditorialUser'
import { getMerchOnboarding } from '@/utilities/merchOnboarding'
import { getPlatformFeePercent } from '@/utilities/money'

type ScheduledJobInput = {
  doc?: {
    relationTo?: 'pages' | 'posts'
    value?: string
  }
  global?: string
  type?: 'publish' | 'unpublish'
}

function formatScheduledDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value))
}

const baseClass = 'before-dashboard'

const BeforeDashboard = async () => {
  const payload = await getPayload({ config: configPromise })
  const now = new Date().toISOString()
  const currentUser = await getMeUser().catch(() => null)
  const user = currentUser?.user || null
  if (!canAccessPayloadDashboard(user)) return null
  const userRole = user?.role || null
  const isMusicalCreator = isMusicalCreatorUser(user)
  const profileID = resolveUserProfileID(user)
  const commerceProducts =
    userRole === 'admin' || isMusicalCreator
      ? await listCommerceProducts({
          includeDrafts: true,
          ownerID: userRole === 'admin' ? null : user?.id ? String(user.id) : null,
          payload,
          profile: profileID,
        })
      : []
  // Read straight from the profile: the sanitized connection lives behind
  // `overrideAccess`, and the admin panel is the one place an artist reliably
  // lands after logging in.
  const commerceProfile =
    profileID && (userRole === 'admin' || isMusicalCreator)
      ? ((await payload
          .findByID({ collection: 'profiles', id: String(profileID), depth: 0, overrideAccess: true })
          .catch(() => null)) as null | Profile)
      : null
  const platformFeePercent = getPlatformFeePercent()
  const merch = getMerchOnboarding({
    hasPublishedProduct: commerceProducts.some((product) => product.status === 'published'),
    profile: commerceProfile,
  })
  const commerceProfileSlug =
    (typeof user?.profile === 'object' && user?.profile && 'slug' in user.profile
      ? user.profile.slug
      : null) ||
    commerceProducts.find((product) => product.profile?.slug)?.profile?.slug ||
    null

  const upcomingJobs = await payload.find({
    collection: 'payload-jobs',
    depth: 0,
    limit: 5,
    overrideAccess: true,
    pagination: false,
    sort: 'waitUntil',
    where: {
      and: [
        {
          taskSlug: {
            equals: 'schedulePublish',
          },
        },
        {
          completedAt: {
            exists: false,
          },
        },
        {
          waitUntil: {
            greater_than: now,
          },
        },
      ],
    },
  })

  const items = await Promise.all(
    upcomingJobs.docs.map(async (job) => {
      const input = (job.input || {}) as ScheduledJobInput
      const typeLabel = input.type === 'unpublish' ? 'Despublicar' : 'Publicar'

      if (input.doc?.relationTo && input.doc.value) {
        const doc = await payload.findByID({
          id: input.doc.value,
          collection: input.doc.relationTo,
          depth: 0,
          overrideAccess: true,
        })

        return {
          id: job.id,
          scheduledFor: formatScheduledDate(job.waitUntil),
          target: doc?.title || input.doc.value,
          typeLabel,
        }
      }

      return {
        id: job.id,
        scheduledFor: formatScheduledDate(job.waitUntil),
        target: input.global || 'Destino desconocido',
        typeLabel,
      }
    }),
  )

  return (
    <section className={baseClass} id="scheduled-publishes">
      {isMusicalCreator ? (
        <section className={`${baseClass}__section`} aria-labelledby="before-dashboard-payments">
          <div className={`${baseClass}__header`}>
            <div>
              <h4 id="before-dashboard-payments">
                Cobros con Mercado Pago{' '}
                <span
                  className={`${baseClass}__badge ${baseClass}__badge--${
                    merch.ready ? 'ready' : merch.needsReconnect ? 'alert' : 'pending'
                  }`}
                >
                  {merch.ready
                    ? 'Listo para vender'
                    : merch.needsReconnect
                      ? 'Requiere acción'
                      : 'Pendiente'}
                </span>
              </h4>
              <p>Cobras directo a tu cuenta. oddsound se queda el {platformFeePercent}%.</p>
            </div>
          </div>

          <ul className={`${baseClass}__meta-list`}>
            {merch.steps.map((step, index) => (
              <li className={`${baseClass}__meta-item`} key={step.key}>
                <span>
                  {step.done ? '✓' : `${index + 1}.`} {step.title}
                </span>
                <strong>{step.detail}</strong>
              </li>
            ))}
          </ul>

          {merch.health.state === 'connected' || merch.health.state === 'expiring' ? (
            <p className={`${baseClass}__empty`}>
              Autorización vigente por {merch.health.daysRemaining} días más. Se renueva sola.
            </p>
          ) : null}

          <div className={`${baseClass}__links`}>
            {merch.nextStep?.action ? (
              <Link
                className={`${baseClass}__link ${baseClass}__link--primary`}
                href={merch.nextStep.action}
              >
                {merch.nextStep.actionLabel}
              </Link>
            ) : null}
            {merch.steps[0]?.done ? (
              <Link className={`${baseClass}__link`} href="/creator-api/payments/connect/start">
                Reconectar Mercado Pago
              </Link>
            ) : null}
            <Link className={`${baseClass}__link`} href="/creator/dashboard">
              Ver mis ventas y envíos
            </Link>
          </div>
        </section>
      ) : null}

      {userRole === 'admin' || isMusicalCreator ? (
        <section className={`${baseClass}__section`} aria-labelledby="before-dashboard-scheduled">
          <div className={`${baseClass}__header`}>
            <div>
              <h4 id="before-dashboard-scheduled">Publicaciones programadas</h4>
              <p>
                Próximas tareas de publicación y despublicación. Hora editorial oficial:
                <strong> America/Bogota</strong>.
              </p>
            </div>
          </div>

          {items.length > 0 ? (
            <ul className={`${baseClass}__list`}>
              {items.map((item) => (
                <li className={`${baseClass}__item`} key={item.id}>
                  <div className={`${baseClass}__item-content`}>
                    <strong>{item.target}</strong>
                    <p>{item.typeLabel}</p>
                  </div>
                  <time>{item.scheduledFor}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${baseClass}__empty`}>No hay publicaciones programadas próximas.</p>
          )}
        </section>
      ) : null}

      {userRole === 'admin' ? (
        <section className={`${baseClass}__section`} aria-labelledby="before-dashboard-editors">
          <div className={`${baseClass}__header`}>
            <div>
              <h4 id="before-dashboard-editors">Editors</h4>
              <p>
                Acceso directo al modulo de cuentas editoriales. Desde ahi puedes crear nuevos
                redactores y administrar sus accesos sin mezclarlos con cuentas de artista o banda.
              </p>
            </div>
          </div>

          <div className={`${baseClass}__links`}>
            <Link
              className={`${baseClass}__link`}
              href="/dashboard/collections/users?where[editorAccess][equals]=true&editors=1"
            >
              Abrir Editors
            </Link>
            <Link className={`${baseClass}__link`} href="/dashboard/collections/users">
              Abrir Users
            </Link>
          </div>
        </section>
      ) : null}

      {userRole === 'admin' || isMusicalCreator ? (
        <section className={`${baseClass}__section`} aria-labelledby="before-dashboard-commerce">
          <div className={`${baseClass}__header`}>
            <div>
              <h4 id="before-dashboard-commerce">Commerce oficial</h4>
              <p>
                Acceso directo al catalogo que ya corre con Payload ecommerce dentro del dashboard
                individual.
              </p>
            </div>
          </div>

          <ul className={`${baseClass}__meta-list`}>
            <li className={`${baseClass}__meta-item`}>
              <span>Productos visibles aqui</span>
              <strong>{commerceProducts.length}</strong>
            </li>
            <li className={`${baseClass}__meta-item`}>
              <span>Perfil vinculado</span>
              <strong>{profileID || 'Sin perfil'}</strong>
            </li>
          </ul>

          <div className={`${baseClass}__links`}>
            <Link className={`${baseClass}__link`} href="/creator/dashboard">
              Abrir mi panel de artista
            </Link>
            <Link className={`${baseClass}__link`} href="/dashboard/collections/products">
              Gestionar productos
            </Link>
            {commerceProfileSlug ? (
              <Link className={`${baseClass}__link`} href={`/${commerceProfileSlug}/shop`}>
                Abrir shop publico
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  )
}

export default BeforeDashboard
