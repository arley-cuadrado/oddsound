import 'dotenv/config'
import { assertPreviewDatabase } from '../src/config/preview'
assertPreviewDatabase()
if (process.env.VERCEL_ENV !== 'preview') throw new Error('Este seed solo se ejecuta en Preview.')
const password = process.env.PREVIEW_DEMO_PASSWORD || ''
if (password.length < 20)
  throw new Error('Define PREVIEW_DEMO_PASSWORD con al menos 20 caracteres.')

const { getPayload } = await import('payload')
const config = (await import('../src/payload.config')).default
const { seedPreview } = await import('../src/seed/preview')
const payload = await getPayload({ config })
try {
  for (const m of Object.values(payload.db.collections)) await m.createIndexes()
  const report = await seedPreview(payload, password)
  console.log(JSON.stringify(report))
} finally {
  await payload.destroy()
}
