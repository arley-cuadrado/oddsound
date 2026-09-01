import { describe, expect, it, vi } from 'vitest'

import { Profiles } from '@/collections/Profiles'

describe('profile normalization', () => {
  it('normalizes group fields to objects instead of null for musical profiles', async () => {
    const beforeChange = Profiles.hooks?.beforeChange?.[0]

    expect(beforeChange).toBeTypeOf('function')

    const result = await beforeChange?.({
      collection: Profiles,
      context: {},
      data: {
        accountType: 'artist',
        displayName: 'Artist Name',
        editorSocialLink: null,
        owner: 'user-1',
      },
      operation: 'create',
      originalDoc: null,
      req: {
        payload: {
          findByID: vi.fn().mockResolvedValue({
            email: 'artist@example.com',
            id: 'user-1',
            role: 'creator',
            userType: 'artist',
          }),
        },
        user: null,
      },
    } as any)

    expect(result).toEqual(
      expect.objectContaining({
        accountType: 'artist',
        editorSocialLink: {},
        profileType: 'artist',
      }),
    )
  })
})
