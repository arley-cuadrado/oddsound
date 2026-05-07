import type { CollectionBeforeChangeHook } from 'payload'

import { isAdminUser } from '@/utilities/isAdminUser'

export const ensureCreatorDefaults: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'create' && operation !== 'update') return data

  const isAdminRequest = isAdminUser(req.user)
  const nextData = { ...data }

  if (operation === 'update' && originalDoc && originalDoc.role === 'admin') {
    nextData.role = 'admin'
  }

  if (!isAdminRequest && nextData.role !== 'admin') {
    nextData.role = 'creator'
    nextData.isActive = true
  }

  if (!nextData.accountType) {
    nextData.accountType = 'artist'
  }

  return nextData
}
