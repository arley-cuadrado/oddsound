import type { CollectionSlug, Payload, Where } from 'payload'

import { withRetry } from './retry'

/** Revalidation calls fail when the seed runs without a Next server in front. */
const SEED_CONTEXT = { disableRevalidate: true }

type BaseArgs = {
  collection: CollectionSlug
  payload: Payload
}

export async function findOne({
  collection,
  payload,
  where,
}: BaseArgs & { where: Where }): Promise<null | Record<string, any>> {
  const result = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where,
  })

  return (result.docs[0] as Record<string, any> | undefined) || null
}

/**
 * Idempotent write keyed on a natural identifier (email, slug, owner). Re-running
 * the seed updates in place instead of duplicating.
 */
export async function upsert({
  collection,
  context,
  data,
  payload,
  where,
}: BaseArgs & {
  context?: Record<string, unknown>
  data: Record<string, unknown>
  where: Where
}): Promise<Record<string, any>> {
  const existing = await findOne({ collection, payload, where })
  const mergedContext = { ...SEED_CONTEXT, ...(context || {}) }

  if (existing) {
    return (await withRetry(() =>
      payload.update({
        collection,
        id: existing.id as string,
        context: mergedContext,
        data: data as never,
        depth: 0,
        overrideAccess: true,
      }),
    )) as Record<string, any>
  }

  return (await withRetry(() =>
    payload.create({
      collection,
      context: mergedContext,
      data: data as never,
      depth: 0,
      overrideAccess: true,
    }),
  )) as Record<string, any>
}

/**
 * Media is looked up by filename and reused as-is when present: every upload
 * regenerates seven derivative sizes through sharp, which dominates seed time.
 */
export async function upsertMedia({
  alt,
  buildBuffer,
  filename,
  owner,
  payload,
}: {
  alt: string
  /** Called only when the file is missing, so re-runs skip image generation. */
  buildBuffer: () => Promise<Buffer>
  filename: string
  owner: string
  payload: Payload
}): Promise<Record<string, any>> {
  // Matched on the base name rather than the exact filename: when public/media
  // still holds files from an earlier run, Payload stores the upload as
  // `name-1.webp`, and an exact match would miss it and upload a duplicate.
  const baseName = filename.replace(/\.[^.]+$/, '')
  const existing = await findOne({
    collection: 'media',
    payload,
    where: {
      filename: {
        like: baseName,
      },
    },
  })

  if (existing) return existing

  const buffer = await buildBuffer()

  return (await withRetry(() =>
    payload.create({
      collection: 'media',
      context: SEED_CONTEXT,
      data: {
        alt,
        owner,
      } as never,
      depth: 0,
      file: {
        data: buffer,
        mimetype: 'image/webp',
        name: filename,
        size: buffer.length,
      },
      overrideAccess: true,
    }),
  )) as Record<string, any>
}

export async function deleteWhere({
  collection,
  payload,
  where,
}: BaseArgs & { where: Where }): Promise<number> {
  const result = await withRetry(() =>
    payload.delete({
      collection,
      context: SEED_CONTEXT,
      depth: 0,
      overrideAccess: true,
      where,
    }),
  )

  return result.docs?.length || 0
}
