import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assignOwnership } from '@/hooks/assignOwnership'
import { ensureConsumerProfile, findConsumerProfileByOwner } from '@/utilities/consumerProfiles'
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

  it('creates editorial profiles without musical account types', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({ id: 'profile-editor-1' }),
      find: vi.fn().mockResolvedValue({
        docs: [],
      }),
      update: vi.fn().mockResolvedValue({}),
    }

    await expect(
      ensureCreatorProfile({
        payload: payload as never,
        user: {
          editorAccess: true,
          email: 'editor@example.com',
          id: 'user-editor-1',
          name: 'Editor One',
          role: 'creator',
        },
      }),
    ).resolves.toBe('profile-editor-1')

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'profiles',
        data: expect.objectContaining({
          contactEmail: 'editor@example.com',
          displayName: 'Editor One',
          editorialProfile: true,
          owner: 'user-editor-1',
          profileType: 'editorial',
        }),
      }),
    )

    expect(payload.create.mock.calls[0]?.[0]?.data).not.toHaveProperty('accountType')
  })

  it('normalizes existing inline editorial profiles away from artist account types', async () => {
    const payload = {
      create: vi.fn(),
      find: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    }

    await expect(
      ensureCreatorProfile({
        payload: payload as never,
        user: {
          editorAccess: true,
          email: 'editor@example.com',
          id: 'user-editor-1',
          profile: 'profile-editor-1',
          role: 'creator',
        },
      }),
    ).resolves.toBe('profile-editor-1')

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'profiles',
        data: expect.objectContaining({
          accountType: null,
          contactEmail: 'editor@example.com',
          editorialProfile: true,
          profileType: 'editorial',
        }),
        id: 'profile-editor-1',
      }),
    )
  })
})

describe('findConsumerProfileByOwner', () => {
  it('returns the first matching consumer profile id for an owner', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [{ id: 'consumer-profile-1' }],
      }),
    }

    await expect(
      findConsumerProfileByOwner({
        ownerID: 'user-1',
        payload: payload as never,
      }),
    ).resolves.toBe('consumer-profile-1')
  })
})

describe('ensureConsumerProfile', () => {
  it('returns the inline consumer profile id without extra queries when it already exists', async () => {
    const payload = {
      find: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }

    await expect(
      ensureConsumerProfile({
        payload: payload as never,
        user: {
          consumerProfile: 'consumer-profile-1',
          id: 'consumer-1',
          userType: 'consumer',
        },
      }),
    ).resolves.toBe('consumer-profile-1')

    expect(payload.find).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'consumerProfiles',
        data: expect.objectContaining({
          displayName: 'Fan',
          email: '',
        }),
        id: 'consumer-profile-1',
      }),
    )
  })

  it('creates a consumer profile and links it back to the user', async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({ id: 'consumer-profile-1' }),
      find: vi.fn().mockResolvedValue({
        docs: [],
      }),
      update: vi.fn().mockResolvedValue({}),
    }

    await expect(
      ensureConsumerProfile({
        payload: payload as never,
        user: {
          email: 'consumer@example.com',
          id: 'consumer-1',
          name: 'Consumer One',
          userType: 'consumer',
        },
      }),
    ).resolves.toBe('consumer-profile-1')

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'consumerProfiles',
        data: expect.objectContaining({
          displayName: 'Consumer One',
          email: 'consumer@example.com',
          owner: 'consumer-1',
          status: 'active',
        }),
      }),
    )

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: expect.objectContaining({
          consumerProfile: 'consumer-profile-1',
        }),
        id: 'consumer-1',
      }),
    )
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
