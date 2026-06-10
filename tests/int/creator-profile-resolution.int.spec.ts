import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assignOwnership } from '@/hooks/assignOwnership'
import { ensureCreatorProfile, findCreatorProfileByOwner } from '@/utilities/creatorProfiles'

describe('findCreatorProfileByOwner', () => {
  it('returns the first matching profile id for a creator owner', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [{ id: 'profile-1' }],
      }),
    }

    await expect(
      findCreatorProfileByOwner({
        ownerID: 'user-1',
        payload: payload as never,
      }),
    ).resolves.toBe('profile-1')
  })
})

describe('ensureCreatorProfile', () => {
  it('returns the inline profile id without extra queries when it already exists', async () => {
    const payload = {
      find: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }

    await expect(
      ensureCreatorProfile({
        payload: payload as never,
        user: {
          id: 'user-1',
          profile: 'profile-1',
          role: 'creator',
        },
      }),
    ).resolves.toBe('profile-1')

    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })
})

describe('assignOwnership', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('caches creator profile lookups within the same request context', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [{ id: 'profile-1' }],
      }),
    }

    const req = {
      context: {},
      payload,
      user: {
        id: 'user-1',
        role: 'creator',
      },
    }

    await assignOwnership({
      data: { title: 'Release 1' },
      req,
    } as never)

    await assignOwnership({
      data: { title: 'Release 2' },
      req,
    } as never)

    expect(payload.find).toHaveBeenCalledTimes(1)
  })

  it('assigns the resolved profile to admins when they already have one', async () => {
    const payload = {
      find: vi.fn(),
    }

    const result = await assignOwnership({
      data: { title: 'Admin Release' },
      req: {
        context: {},
        payload,
        user: {
          id: 'admin-1',
          profile: 'profile-admin-1',
          role: 'admin',
        },
      },
    } as never)

    expect(result).toMatchObject({
      owner: 'admin-1',
      profile: 'profile-admin-1',
      title: 'Admin Release',
    })
    expect(payload.find).not.toHaveBeenCalled()
  })
})
