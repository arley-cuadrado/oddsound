import { describe, expect, it, vi } from 'vitest'

import { Profiles } from '@/collections/Profiles'
import { Users } from '@/collections/Users'
import {
  populateCreatorAccountProfile,
  syncCreatorAccountProfile,
} from '@/collections/Users/hooks/syncCreatorAccountProfile'

describe('creator account profile synchronization', () => {
  it('loads existing public profile fields into the creator account', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 'profile-1' }] })
    const findByID = vi.fn().mockResolvedValue({
      avatar: 'media-1',
      genre: 'Reggae',
      location: 'Colombia',
    })

    const result = await populateCreatorAccountProfile({
      doc: {
        accountType: 'artist',
        id: 'creator-1',
        role: 'creator',
        userType: 'artist',
      },
      req: {
        payload: { find, findByID },
        user: { id: 'creator-1' },
      },
    } as any)

    expect(result).toMatchObject({
      accountAvatar: 'media-1',
      genre: 'Reggae',
      location: 'Colombia',
    })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'profiles',
        where: { owner: { equals: 'creator-1' } },
      }),
    )
  })

  it('synchronizes account edits to the linked public profile', async () => {
    const update = vi.fn().mockResolvedValue({})

    await syncCreatorAccountProfile({
      data: {
        accountAvatar: 'media-2',
        accountType: 'band',
        genre: 'Rock',
        location: 'Medellín',
        name: 'Nueva Banda',
      },
      doc: {
        accountAvatar: 'media-2',
        accountType: 'band',
        genre: 'Rock',
        id: 'creator-1',
        location: 'Medellín',
        name: 'Nueva Banda',
        profile: 'profile-1',
        role: 'creator',
        userType: 'band',
      },
      operation: 'update',
      req: { payload: { update } },
    } as any)

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'profiles',
        data: {
          accountType: 'band',
          avatar: 'media-2',
          displayName: 'Nueva Banda',
          genre: 'Rock',
          location: 'Medellín',
          profileType: 'band',
        },
        id: 'profile-1',
        overrideAccess: true,
      }),
    )
  })

  it('hides the redundant profile collection and editorial switch for artists', () => {
    const editorAccessField = Users.fields.find(
      (field) => 'name' in field && field.name === 'editorAccess',
    ) as any

    expect(Profiles.admin?.hidden).toBe(true)
    expect(
      editorAccessField.admin.condition({}, {}, { user: { role: 'creator', userType: 'artist' } }),
    ).toBe(false)
  })
})
