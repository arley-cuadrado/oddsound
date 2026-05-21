import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

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
      <div className={`${baseClass}__panel`}>
        <div className={`${baseClass}__header`}>
          <div>
            <h4>Publicaciones programadas</h4>
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
      </div>
    </section>
  )
}

export default BeforeDashboard
