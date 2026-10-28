import type { Payload } from 'payload'
import { randomUUID } from 'node:crypto'
import { CommerceError, validatePostings, type Posting } from './domain'

// Mongoose models are confined to this persistence boundary. All service writes
// use a shared session; Payload REST/GraphQL writes to these collections are denied.
export function model(payload: Payload, collection: string) {
  const value = payload.db.collections[collection]
  if (!value) throw new Error(`Missing commerce model: ${collection}`)
  return value
}

export type Session = Awaited<ReturnType<ReturnType<typeof model>['db']['startSession']>>
export const idOf = (value: unknown): string => {
  if (!value) return ''
  if (
    typeof value === 'object' &&
    'toHexString' in value &&
    typeof value.toHexString === 'function'
  )
    return value.toHexString()
  if (typeof value === 'object' && 'id' in value) return String(value.id)
  return String(value)
}

export async function atomic<T>(
  payload: Payload,
  artist: string,
  run: (session: Session) => Promise<T>,
): Promise<T> {
  const locks = model(payload, 'commerceLocks')
  try {
    await locks.updateOne(
      { key: artist },
      { $setOnInsert: { key: artist, revision: 0 } },
      { upsert: true },
    )
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error
  }
  const session = await locks.db.startSession()
  try {
    let result: T | undefined
    await session.withTransaction(
      async () => {
        await locks.updateOne({ key: artist }, { $inc: { revision: 1 } }, { session })
        result = await run(session)
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
    )
    return result as T
  } finally {
    await session.endSession()
  }
}

export async function insert(
  payload: Payload,
  collection: string,
  data: Record<string, unknown>,
  session?: Session,
) {
  const now = new Date().toISOString()
  const [doc] = await model(payload, collection).create(
    [{ ...data, createdAt: now, updatedAt: now }],
    { session },
  )
  return doc.toObject()
}

export async function journal(
  payload: Payload,
  session: Session,
  entry: {
    reference: string
    artist?: string
    order?: string
    kind: string
    postings: Posting[]
    evidence?: unknown
  },
) {
  validatePostings(entry.postings)
  const existing = await model(payload, 'commerceJournal')
    .findOne({ reference: entry.reference })
    .session(session)
    .lean<any>()
  if (existing) {
    if (JSON.stringify(existing.postings) !== JSON.stringify(entry.postings))
      throw new CommerceError('Referencia contable reutilizada con importes diferentes.')
    return existing
  }
  return insert(payload, 'commerceJournal', entry, session)
}

export async function balance(
  payload: Payload,
  account: string,
  session?: Session,
): Promise<number> {
  const pipeline = model(payload, 'commerceJournal').aggregate([
    { $match: { 'postings.account': account } },
    { $unwind: '$postings' },
    { $match: { 'postings.account': account } },
    { $group: { _id: null, amount: { $sum: '$postings.amount' } } },
  ])
  if (session) pipeline.session(session)
  return (await pipeline)[0]?.amount || 0
}

export const account = (artist: string, order: string, bucket: string) =>
  `artist:${artist}:order:${order}:${bucket}`

export async function audit(
  payload: Payload,
  actor: string,
  action: string,
  details: unknown,
  session?: Session,
) {
  return insert(
    payload,
    'commerceAudits',
    { reference: randomUUID(), actor, action, details },
    session,
  )
}

export async function enqueue(
  payload: Payload,
  reference: string,
  kind: string,
  data: unknown,
  session?: Session,
  dueAt = new Date(),
) {
  await model(payload, 'commerceTasks').updateOne(
    { reference },
    {
      $setOnInsert: {
        reference,
        kind,
        data,
        dueAt: dueAt.toISOString(),
        state: 'pending',
        attempts: 0,
      },
    },
    { upsert: true, session },
  )
}

export async function settings(payload: Payload) {
  return payload.findGlobal({ slug: 'commerceSettings', depth: 0, overrideAccess: true })
}

export async function touchOrder(
  payload: Payload,
  orderID: string,
  data: Record<string, unknown>,
  session: Session,
) {
  await model(payload, 'orders').updateOne(
    { _id: orderID },
    { $set: { ...data, updatedAt: new Date().toISOString() } },
    { session },
  )
}
