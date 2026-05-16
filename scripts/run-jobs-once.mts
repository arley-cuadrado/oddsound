import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config })

const now = new Date().toISOString()

const runnableJobs = await payload.find({
  collection: 'payload-jobs',
  depth: 0,
  limit: 50,
  overrideAccess: true,
  pagination: false,
  where: {
    and: [
      {
        completedAt: {
          exists: false,
        },
      },
      {
        hasError: {
          not_equals: true,
        },
      },
      {
        processing: {
          equals: false,
        },
      },
      {
        or: [
          {
            waitUntil: {
              exists: false,
            },
          },
          {
            waitUntil: {
              less_than: now,
            },
          },
        ],
      },
      {
        queue: {
          equals: 'default',
        },
      },
    ],
  },
})

const schedules = await payload.jobs.handleSchedules({
  queue: 'default',
})

const result = await payload.jobs.run({
  limit: 50,
  overrideAccess: true,
  queue: 'default',
  silent: false,
})

console.log(
  JSON.stringify(
    {
      now,
      runnableJobs: runnableJobs.docs.map((job) => ({
        id: job.id,
        queue: job.queue,
        waitUntil: job.waitUntil,
        processing: job.processing,
        completedAt: job.completedAt,
        hasError: job.hasError,
        totalTried: job.totalTried,
      })),
      schedules,
      result,
    },
    null,
    2,
  ),
)
