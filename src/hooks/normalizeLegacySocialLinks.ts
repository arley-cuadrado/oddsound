import type { CollectionAfterReadHook, CollectionBeforeChangeHook } from 'payload'

import { normalizeSocialLinksWithLegacy } from '@/utilities/socialLinks'

export const normalizeLegacySocialLinksBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
}) => {
  return normalizeSocialLinksWithLegacy({
    ...(originalDoc && typeof originalDoc === 'object' ? originalDoc : {}),
    ...(data && typeof data === 'object' ? data : {}),
  })
}

export const normalizeLegacySocialLinksAfterRead: CollectionAfterReadHook = ({ doc }) => {
  if (!doc || typeof doc !== 'object') {
    return doc
  }

  return normalizeSocialLinksWithLegacy(doc)
}
