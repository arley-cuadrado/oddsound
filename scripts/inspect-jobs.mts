import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config, cron: true })

const jobs = await payload.find({
  collection: 'payload-jobs',
  depth: 0,
  limit: 20,
  overrideAccess: true,
  sort: '-createdAt',
})

console.log(
  JSON.stringify(
    jobs.docs.map((job) => ({
      keys: Object.keys(job),
      id: job.id,
      taskSlug: job.taskSlug,
      queue: job.queue,
      waitUntil: job.waitUntil,
      processing: job.processing,
      completedAt: job.completedAt,
      hasError: job.hasError,
      error: job.error,
      totalTried: job.totalTried,
      input: job.input,
      log: job.log,
    })),
    null,
    2,
  ),
)
