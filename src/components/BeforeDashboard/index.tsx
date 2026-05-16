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
  if (!value) return 'No date'

  return new Intl.DateTimeFormat('en-US', {
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
      const typeLabel = input.type === 'unpublish' ? 'Unpublish' : 'Publish'

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
        target: input.global || 'Unknown target',
        typeLabel,
      }
    }),
  )

  return (
    <section className={baseClass} id="scheduled-publishes">
      <div className={`${baseClass}__panel`}>
        <div className={`${baseClass}__header`}>
          <div>
            <h4>Scheduled publishes</h4>
            <p>
              Upcoming publish and unpublish jobs. Official editorial time:
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
          <p className={`${baseClass}__empty`}>No upcoming scheduled publish events.</p>
        )}
      </div>
    </section>
  )
}

export default BeforeDashboard
