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

  it('propagates creator profile failures so the transaction cannot appear successful', async () => {
    mocks.ensureCreatorProfile.mockRejectedValue(
      new Error("Cannot read properties of null (reading 'label')"),
    )

    await expect(
      createProfile({
        operation: 'create',
        req: {
          context: {},
          payload: {},
        },
        result: {
          accountType: 'artist',
          email: 'artist@example.com',
          id: 'creator-1',
          name: 'Artist Name',
          role: 'creator',
          userType: 'artist',
        },
      } as any),
    ).rejects.toThrow("Cannot read properties of null (reading 'label')")
  })

  it('propagates consumer profile failures so the transaction cannot appear successful', async () => {
    mocks.ensureConsumerProfile.mockRejectedValue(
      new Error("Cannot read properties of null (reading 'label')"),
    )

    await expect(
      createProfile({
        operation: 'create',
        req: {
          context: {},
          payload: {},
        },
        result: {
          email: 'fan@example.com',
          id: 'fan-1',
          name: 'Fan Name',
          role: 'creator',
          userType: 'fan',
        },
      } as any),
    ).rejects.toThrow("Cannot read properties of null (reading 'label')")
  })

  it('defers profile creation when the caller must commit the user first', async () => {
    const result = {
      email: 'artist@example.com',
      id: 'creator-1',
      role: 'creator',
      userType: 'artist',
    }

    await expect(
      createProfile({
        operation: 'create',
        req: {
          context: {
            deferProfileCreation: true,
          },
        },
        result,
      } as any),
    ).resolves.toBe(result)

    expect(mocks.ensureCreatorProfile).not.toHaveBeenCalled()
    expect(mocks.ensureConsumerProfile).not.toHaveBeenCalled()
  })
})
