import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ensureConsumerProfile: vi.fn(),
  ensureCreatorProfile: vi.fn(),
}))

vi.mock('@/utilities/consumerProfiles', () => ({
  ensureConsumerProfile: mocks.ensureConsumerProfile,
}))

vi.mock('@/utilities/creatorProfiles', () => ({
  ensureCreatorProfile: mocks.ensureCreatorProfile,
}))

import { createProfile } from '@/collections/Users/hooks/createProfile'

describe('user createProfile hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fail signup when creator profile creation throws', async () => {
    const logger = {
      error: vi.fn(),
    }

    mocks.ensureCreatorProfile.mockRejectedValue(
      new Error("Cannot read properties of null (reading 'label')"),
    )

    const result = await createProfile({
      operation: 'create',
      req: {
        payload: {
          logger,
        },
      },
      result: {
        accountType: 'artist',
        email: 'artist@example.com',
        id: 'creator-1',
        name: 'Artist Name',
        role: 'creator',
        userType: 'artist',
      },
    } as any)

    expect(result).toEqual(
      expect.objectContaining({
        email: 'artist@example.com',
        id: 'creator-1',
        role: 'creator',
      }),
    )
    expect(logger.error).toHaveBeenCalled()
  })

  it('does not fail signup when consumer profile creation throws', async () => {
    const logger = {
      error: vi.fn(),
    }

    mocks.ensureConsumerProfile.mockRejectedValue(
      new Error("Cannot read properties of null (reading 'label')"),
    )

    const result = await createProfile({
      operation: 'create',
      req: {
        payload: {
          logger,
        },
      },
      result: {
        email: 'fan@example.com',
        id: 'fan-1',
        name: 'Fan Name',
        role: 'creator',
        userType: 'fan',
      },
    } as any)

    expect(result).toEqual(
      expect.objectContaining({
        email: 'fan@example.com',
        id: 'fan-1',
        role: 'creator',
        userType: 'fan',
      }),
    )
    expect(logger.error).toHaveBeenCalled()
  })
})
