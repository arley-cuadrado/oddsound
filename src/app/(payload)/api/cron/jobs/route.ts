import config from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * The trigger for every scheduled job in the app.
 *
 * Payload's `jobs.autoRun` only fires while a Node process stays alive, which a
 * serverless deployment cannot promise — its own type says as much. So the
 * schedule lives in `vercel.json` and lands here: first queue whatever is due,
 * then run it.
 *
 * Vercel attaches `Authorization: Bearer $CRON_SECRET` to cron invocations
 * whenever `CRON_SECRET` is set, which is the same header
 * `jobs.access.run` already expects.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return Response.json({ message: 'CRON_SECRET is not configured.' }, { status: 503 })
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })

  const scheduled = await payload.jobs.handleSchedules({ allQueues: true })
  const ran = await payload.jobs.run({ allQueues: true, limit: 100 })

  return Response.json({
    ok: true,
    queued: scheduled?.queued?.length ?? 0,
    ran: Object.keys(ran?.jobStatus || {}).length,
  })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
