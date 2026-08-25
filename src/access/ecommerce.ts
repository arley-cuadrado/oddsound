import type { Access, FieldAccess } from 'payload'

import { hasFreshAdminAccess } from './hasFreshAdminAccess'
import { isAdminUser } from '@/utilities/isAdminUser'
import { isFanUser } from '@/utilities/isEditorialUser'

type RequestUser = {
  id?: number | string
  role?: null | string
} | null

type EcommerceAccessArgs = {
  req: {
    payload: any
    user?: RequestUser
  }
}

const getUser = ({ req }: EcommerceAccessArgs) => req.user ?? null

const hasEcommerceAdminAccess = async ({ req }: EcommerceAccessArgs) => {
  if (isAdminUser(req.user)) return true

  return hasFreshAdminAccess(req)
}

export const ecommerceIsAuthenticated: Access = ({ req }) => {
  return Boolean(req.user) && !isFanUser(req.user)
}

export const ecommerceIsAdmin: Access = async ({ req }: EcommerceAccessArgs) => {
  return hasEcommerceAdminAccess({ req })
}

export const ecommerceIsCustomer: FieldAccess = ({ req }: EcommerceAccessArgs) => {
  const user = getUser({ req })

  return Boolean(user) && !isAdminUser(user) && !isFanUser(user)
}

export const ecommerceAdminOnlyFieldAccess: FieldAccess = async ({ req }: EcommerceAccessArgs) => {
  return hasEcommerceAdminAccess({ req })
}

export const ecommerceAdminOrPublishedStatus: Access = async ({ req }: EcommerceAccessArgs) => {
  if (await hasEcommerceAdminAccess({ req })) return true

  return {
    _status: {
      equals: 'published',
    },
  }
}

export const ecommerceIsDocumentOwner: Access = async ({ req }: EcommerceAccessArgs) => {
  const user = getUser({ req })

  if (!user) return false
  if (isFanUser(user)) return false
  if (await hasEcommerceAdminAccess({ req })) return true

  return {
    customer: {
      equals: user.id,
    },
  }
}

export const ecommercePublicAccess: Access = () => true
