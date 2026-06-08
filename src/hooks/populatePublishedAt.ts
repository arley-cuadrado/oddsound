import type { CollectionBeforeChangeHook } from 'payload'

type StatusDoc = {
  _status?: null | string
  publishedAt?: Date | null | string
}

export const populatePublishedAt: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  const incomingData = (data || {}) as StatusDoc
  const previousDoc = (originalDoc || null) as null | StatusDoc
  const isPublishingNewDocument = operation === 'create' && incomingData._status === 'published'
  const isPublishingDraft =
    operation === 'update' &&
    incomingData._status === 'published' &&
    previousDoc?._status !== 'published'

  if (isPublishingNewDocument || isPublishingDraft) {
    const now = new Date()

    return {
      ...data,
      publishedAt: now,
    }
  }

  return data
}
