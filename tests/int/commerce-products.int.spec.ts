import { describe, expect, it, vi } from 'vitest'

import {
  groupCommerceProductsByRelease,
  listCommerceProducts,
  resolveUserProfileID,
} from '@/utilities/commerceProducts'

describe('commerce product utilities', () => {
  it('resolves inline user profile ids', () => {
    expect(resolveUserProfileID({ profile: 'profile-1' } as never)).toBe('profile-1')
    expect(resolveUserProfileID({ profile: { id: 'profile-2' } } as never)).toBe('profile-2')
    expect(resolveUserProfileID({} as never)).toBeNull()
  })

  it('returns an empty list when an explicit profile slug cannot be resolved', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID: vi.fn().mockRejectedValue(new Error('missing')),
    }

    await expect(
      listCommerceProducts({
        payload: payload as never,
        profile: 'missing-profile',
      }),
    ).resolves.toEqual([])

    expect(payload.find).toHaveBeenCalledTimes(1)
  })

  it('builds a scoped products query for owned release commerce data', async () => {
    const payload = {
      find: vi
        .fn()
        .mockResolvedValueOnce({
          docs: [{ id: 'profile-1' }],
        })
        .mockResolvedValueOnce({
          docs: [{ id: 'release-1' }],
        })
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'product-1',
              _status: 'draft',
              createdAt: '2026-08-05T00:00:00.000Z',
              currency: 'USD',
              inventory: 7,
              priceInUSD: 25,
              profile: { id: 'profile-1', slug: 'artist-1', displayName: 'Artist 1' },
              release: { id: 'release-1', slug: 'release-1', title: 'Release 1' },
              slug: 'product-1',
              title: 'Product 1',
              updatedAt: '2026-08-05T00:00:00.000Z',
            },
          ],
        }),
      findByID: vi.fn().mockRejectedValue(new Error('fallback to slug')),
    }

    const products = await listCommerceProducts({
      includeDrafts: true,
      ownerID: 'user-1',
      payload: payload as never,
      profile: 'artist-1',
      release: 'release-1',
    })

    expect(payload.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: 'products',
        where: {
          and: [
            {
              owner: {
                equals: 'user-1',
              },
            },
            {
              profile: {
                equals: 'profile-1',
              },
            },
            {
              release: {
                equals: 'release-1',
              },
            },
          ],
        },
      }),
    )
    expect(products).toEqual([
      expect.objectContaining({
        id: 'product-1',
        profile: {
          id: 'profile-1',
          slug: 'artist-1',
          title: 'Artist 1',
        },
        release: {
          id: 'release-1',
          slug: 'release-1',
          title: 'Release 1',
        },
        status: 'draft',
        title: 'Product 1',
      }),
    ])
  })

  it('groups products by release while keeping unlinked items separate', () => {
    const groups = groupCommerceProductsByRelease([
      {
        createdAt: '2026-08-05T00:00:00.000Z',
        id: 'product-1',
        release: { id: 'release-1', slug: 'release-1', title: 'Release 1' },
        title: 'Product 1',
        updatedAt: '2026-08-05T10:00:00.000Z',
      },
      {
        createdAt: '2026-08-05T00:00:00.000Z',
        id: 'product-2',
        release: null,
        title: 'Product 2',
        updatedAt: '2026-08-05T09:00:00.000Z',
      },
      {
        createdAt: '2026-08-05T00:00:00.000Z',
        id: 'product-3',
        release: { id: 'release-1', slug: 'release-1', title: 'Release 1' },
        title: 'Product 3',
        updatedAt: '2026-08-05T08:00:00.000Z',
      },
    ] as never)

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      products: [expect.objectContaining({ id: 'product-1' }), expect.objectContaining({ id: 'product-3' })],
      release: {
        id: 'release-1',
      },
    })
    expect(groups[1]).toMatchObject({
      products: [expect.objectContaining({ id: 'product-2' })],
      release: null,
    })
  })
})
