import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/access/hasFreshAdminAccess', () => ({
  hasFreshAdminAccess: vi.fn(),
}))

import { hasFreshAdminAccess } from '@/access/hasFreshAdminAccess'
import {
  ecommerceAdminOnlyFieldAccess,
  ecommerceAdminOrPublishedStatus,
  ecommerceIsAuthenticated,
  ecommerceIsCustomer,
  ecommerceIsDocumentOwner,
  ecommercePublicAccess,
} from '@/access/ecommerce'

const mockedHasFreshAdminAccess = vi.mocked(hasFreshAdminAccess)

describe('ecommerce access helpers', () => {
  beforeEach(() => {
    mockedHasFreshAdminAccess.mockReset()
  })

  it('treats creators as authenticated customers', () => {
    const req = {
      payload: {},
      user: {
        id: 'creator-1',
        role: 'creator',
      },
    }

    expect(ecommerceIsAuthenticated({ req } as never)).toBe(true)
    expect(ecommerceIsCustomer({ req } as never)).toBe(true)
  })

  it('treats admins as non-customer users with full field access', async () => {
    const req = {
      payload: {},
      user: {
        id: 'admin-1',
        role: 'admin',
      },
    }

    await expect(ecommerceAdminOnlyFieldAccess({ req } as never)).resolves.toBe(true)
    expect(ecommerceIsCustomer({ req } as never)).toBe(false)
    expect(mockedHasFreshAdminAccess).not.toHaveBeenCalled()
  })

  it('returns published-only access for unauthenticated reads', async () => {
    const req = {
      payload: {},
      user: null,
    }

    await expect(ecommerceAdminOrPublishedStatus({ req } as never)).resolves.toEqual({
      _status: {
        equals: 'published',
      },
    })
  })

  it('returns customer-scoped ownership for authenticated non-admin users', async () => {
    mockedHasFreshAdminAccess.mockResolvedValue(false)

    const req = {
      payload: {},
      user: {
        id: 'creator-1',
        role: 'creator',
      },
    }

    await expect(ecommerceIsDocumentOwner({ req } as never)).resolves.toEqual({
      customer: {
        equals: 'creator-1',
      },
    })
  })

  it('falls back to the fresh-admin check for non-admin requests', async () => {
    mockedHasFreshAdminAccess.mockResolvedValue(true)

    const req = {
      payload: {},
      user: {
        id: 'creator-1',
        role: 'creator',
      },
    }

    await expect(ecommerceAdminOnlyFieldAccess({ req } as never)).resolves.toBe(true)
    expect(mockedHasFreshAdminAccess).toHaveBeenCalledTimes(1)
  })

  it('exposes public access explicitly', () => {
    expect(ecommercePublicAccess({} as never)).toBe(true)
  })
})
