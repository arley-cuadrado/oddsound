import type { CollectionBeforeChangeHook } from 'payload'

export const populateProductPublishedAt: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data?.status !== 'active') return data
  if (data?.publishedAt) return data
  if (originalDoc?.publishedAt) return data

  return {
    ...data,
    publishedAt: new Date(),
  }
}
