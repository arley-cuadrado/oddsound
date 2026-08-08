import type { Payload } from 'payload'

import type { SellerPaymentAccount } from '@/payload-types'
import { decryptSecret } from './secrets'

export async function findSellerPaymentAccountByProfile({
  payload,
  profileID,
}: {
  payload: Payload
  profileID?: null | string
}): Promise<null | SellerPaymentAccount> {
  if (!profileID) return null

  const result = await payload.find({
    collection: 'seller-payment-accounts',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        {
          profile: {
            equals: profileID,
          },
        },
        {
          provider: {
            equals: 'mercadopago',
          },
        },
      ],
    },
  })

  return (result.docs[0] as SellerPaymentAccount | undefined) || null
}

export async function findSellerPaymentAccountByOwner({
  payload,
  ownerID,
}: {
  payload: Payload
  ownerID?: null | string
}): Promise<null | SellerPaymentAccount> {
  if (!ownerID) return null

  const result = await payload.find({
    collection: 'seller-payment-accounts',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      owner: {
        equals: ownerID,
      },
    },
  })

  return (result.docs[0] as SellerPaymentAccount | undefined) || null
}

export function getSellerAccessToken(account: null | SellerPaymentAccount | undefined) {
  return decryptSecret(account?.encryptedAccessToken)
}

export function sanitizeSellerPaymentAccount(account: null | SellerPaymentAccount | undefined) {
  if (!account) return null

  return {
    accountStatus: account.accountStatus || 'disconnected',
    canReceivePayments: Boolean(account.canReceivePayments),
    defaultDispatchLeadTimeDays: account.defaultDispatchLeadTimeDays || 0,
    id: account.id,
    kycStatus: account.kycStatus || 'unknown',
    lastError: account.lastError || null,
    lastSyncedAt: account.lastSyncedAt || null,
    oauthConnectedAt: account.oauthConnectedAt || null,
    profile: typeof account.profile === 'string' ? account.profile : account.profile?.id || null,
    provider: account.provider || 'mercadopago',
    providerSellerEmail: account.providerSellerEmail || null,
    providerSellerID: account.providerSellerID || null,
    providerSellerNickname: account.providerSellerNickname || null,
    shippingOriginDepartment: account.shippingOriginDepartment || null,
  }
}
