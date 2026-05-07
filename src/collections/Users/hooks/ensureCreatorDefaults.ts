import type { CollectionBeforeChangeHook } from 'payload'

import { isAdminUser } from '@/utilities/isAdminUser'
import { isSuperAdminUser } from '@/utilities/isSuperAdminUser'

export const ensureCreatorDefaults: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'create' && operation !== 'update') return data

  const isAdminRequest = isAdminUser(req.user)
  const isSuperAdminRequest = isSuperAdminUser(req.user)
  const nextData = { ...data }

  if (operation === 'update' && originalDoc && originalDoc.role === 'admin') {
    nextData.role = 'admin'
  }

  if (!isSuperAdminRequest && nextData.role === 'admin' && originalDoc?.role !== 'admin') {
    nextData.role = 'creator'
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
