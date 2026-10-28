import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { workerTick } from '../src/commerce/worker'
const payload = await getPayload({ config })
let stop = false
process.on('SIGTERM', () => {
  stop = true
})
process.on('SIGINT', () => {
  stop = true
})
do {
  try {
    await workerTick(payload)
  } catch (error) {
    payload.logger.error({ error }, 'Commerce worker failed; work remains persisted.')
  }
  if (process.argv.includes('--once')) break
  if (!stop) await new Promise((resolve) => setTimeout(resolve, 30000))
} while (!stop)
await payload.destroy()
