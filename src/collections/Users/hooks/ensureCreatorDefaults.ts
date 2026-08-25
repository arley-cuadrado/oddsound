import type { CollectionBeforeChangeHook } from 'payload'

import { isAdminUser } from '@/utilities/isAdminUser'
import { isSuperAdminUser } from '@/utilities/isSuperAdminUser'

function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function resolveUniqueUsername(args: {
  currentID?: number | string
  payload: Parameters<CollectionBeforeChangeHook>[0]['req']['payload']
  seed: string
}) {
  const { currentID, payload, seed } = args
  const normalizedSeed = normalizeUsername(seed) || 'editor'
  let candidate = normalizedSeed
  let suffix = 2

  while (true) {
    const existing = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [
          {
            username: {
              equals: candidate,
            },
          },
          ...(currentID
            ? [
                {
                  id: {
                    not_equals: currentID,
                  },
                },
              ]
            : []),
        ],
      },
    })

    if (existing.docs.length === 0) return candidate

    candidate = `${normalizedSeed}-${suffix}`
    suffix += 1
  }
}

export const ensureCreatorDefaults: CollectionBeforeChangeHook = async ({
  context,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'create' && operation !== 'update') return data
  if (context?.allowAdminPromotion) return data

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

  if (typeof nextData.userType !== 'string' || !nextData.userType) {
    nextData.userType =
      typeof originalDoc?.userType === 'string' && originalDoc.userType
        ? originalDoc.userType
        : 'creator'
  }

  if (nextData.role === 'admin') {
    nextData.editorAccess = false
    if (nextData.userType === 'consumer' || nextData.userType === 'fan') {
      nextData.userType = 'creator'
    }
  } else if (typeof nextData.editorAccess === 'boolean') {
    nextData.editorAccess = nextData.editorAccess
  } else if (typeof originalDoc?.editorAccess === 'boolean') {
    nextData.editorAccess = originalDoc.editorAccess
  } else if (typeof nextData.editorAccess !== 'boolean') {
    nextData.editorAccess = false
  }

  if (nextData.userType === 'consumer' || nextData.userType === 'fan') {
    nextData.editorAccess = false
    nextData.accountType = null
    nextData.profile = null
  } else if (!nextData.editorAccess && !nextData.accountType) {
    nextData.accountType = 'artist'
  }

  const currentID =
    typeof originalDoc?.id === 'string' || typeof originalDoc?.id === 'number'
      ? originalDoc.id
      : undefined

  const requestedUsername =
    typeof nextData.username === 'string' && nextData.username.trim()
      ? nextData.username
      : typeof originalDoc?.username === 'string' && originalDoc.username.trim()
        ? originalDoc.username
        : typeof nextData.name === 'string' && nextData.name.trim()
          ? nextData.name
          : typeof nextData.email === 'string' && nextData.email.includes('@')
            ? nextData.email.split('@')[0] || ''
            : ''

  nextData.username = await resolveUniqueUsername({
    currentID,
    payload: req.payload,
    seed: requestedUsername,
  })

  return nextData
}
