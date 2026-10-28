import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { model } from '../src/commerce/store'
import { seedCarriers } from '../src/commerce/tracking'
const payload = await getPayload({ config })
try {
  await model(payload, 'orders').collection.createIndex(
    { 'finance.reference': 1 },
    { unique: true, sparse: true, name: 'unique_wompi_reference' },
  )
  await model(payload, 'commerceJournal').collection.createIndex({ 'postings.account': 1 })
  await model(payload, 'commerceTasks').collection.createIndex({
    state: 1,
    dueAt: 1,
    leaseUntil: 1,
  })
  await seedCarriers(payload)
  payload.logger.info(
    'Commerce indexes and disabled carrier catalogue initialized. Existing financial data unchanged.',
  )
} finally {
  await payload.destroy()
}
