import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import { getMeUser } from '@/utilities/getMeUser'
import { listCommerceProducts, resolveUserProfileID } from '@/utilities/commerceProducts'

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
  const userRole = user?.role || null
  const profileID = resolveUserProfileID(user)
  const commerceProducts =
    userRole === 'admin' || userRole === 'creator'
      ? await listCommerceProducts({
          includeDrafts: true,
          ownerID: userRole === 'admin' ? null : user?.id ? String(user.id) : null,
          payload,
          profile: profileID,
        })
      : []
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

      {userRole === 'admin' || userRole === 'creator' ? (
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
              Abrir vista remota de commerce
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
