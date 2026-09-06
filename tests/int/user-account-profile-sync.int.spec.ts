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
    const findByID = vi.fn().mockImplementation(({ collection }) => {
      if (collection === 'media') {
        return Promise.resolve({ id: 'media-1', thumbnailURL: '/media/avatar-thumb.jpg' })
      }

      return Promise.resolve({
        avatar: 'media-1',
        genre: 'Reggae',
        location: 'Colombia',
      })
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
      accountAvatar: { id: 'media-1', thumbnailURL: '/media/avatar-thumb.jpg' },
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

  it('loads and synchronizes editorial account fields', async () => {
    const findByID = vi.fn().mockImplementation(({ collection }) => {
      if (collection === 'media') {
        return Promise.resolve({ id: 'media-editor', url: '/media/editor-avatar.jpg' })
      }

      return Promise.resolve({
        avatar: 'media-editor',
        bio: 'Escritor musical.',
        editorSocialLink: { label: 'Instagram', url: 'https://instagram.com/editor' },
      })
    })
    const update = vi.fn().mockResolvedValue({})

    const result = await populateCreatorAccountProfile({
      doc: {
        editorAccess: true,
        id: 'editor-1',
        profile: 'profile-editor',
        role: 'creator',
        userType: 'editor',
      },
      req: { payload: { findByID }, user: { id: 'editor-1' } },
    } as any)

    expect(result).toMatchObject({
      accountAvatar: { id: 'media-editor', url: '/media/editor-avatar.jpg' },
      editorBio: 'Escritor musical.',
      editorSocialLink: { label: 'Instagram', url: 'https://instagram.com/editor' },
    })

    await syncCreatorAccountProfile({
      data: {
        accountAvatar: 'media-editor-next',
        editorBio: 'Nueva bio.',
        editorSocialLink: { label: 'X', url: 'https://x.com/editor' },
      },
      doc: {
        accountAvatar: 'media-editor-next',
        editorAccess: true,
        editorBio: 'Nueva bio.',
        editorSocialLink: { label: 'X', url: 'https://x.com/editor' },
        id: 'editor-1',
        profile: 'profile-editor',
        role: 'creator',
        userType: 'editor',
      },
      operation: 'update',
      req: { payload: { update } },
    } as any)

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          avatar: 'media-editor-next',
          bio: 'Nueva bio.',
          editorSocialLink: { label: 'X', url: 'https://x.com/editor' },
        },
        id: 'profile-editor',
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
