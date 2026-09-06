import { describe, expect, it, vi } from 'vitest'

import { Profiles } from '@/collections/Profiles'

describe('profile editorial state', () => {
  it('keeps admin-owned profiles editorial during beforeChange normalization', async () => {
    const beforeChange = Profiles.hooks?.beforeChange?.[0]

    expect(beforeChange).toBeTypeOf('function')

    const result = await beforeChange?.({
      data: {
        contactEmail: 'admin@oddsound.co',
        displayName: 'Admin One',
        editorialProfile: true,
        owner: 'admin-1',
        profileType: 'editorial',
        slug: 'admin-one',
      },
      operation: 'create',
      req: {
        payload: {
          findByID: vi.fn().mockResolvedValue({
            email: 'admin@oddsound.co',
            id: 'admin-1',
            name: 'Admin One',
            role: 'admin',
          }),
          update: vi.fn(),
        },
      },
    } as any)

    expect(result).toEqual(
      expect.objectContaining({
        accountType: null,
        contactEmail: 'admin@oddsound.co',
        displayName: 'Admin One',
        editorialProfile: true,
        profileType: 'editorial',
      }),
    )
  })

  it('declares the editorial identity ui field with an empty label placeholder', () => {
    const editorialIdentityField = Profiles.fields.find(
      (field: any) => field?.name === 'editorialIdentity',
    ) as any

    expect(editorialIdentityField).toBeTruthy()
    expect(editorialIdentityField.type).toBe('ui')
    expect(editorialIdentityField.label).toBe('')
  })
})
