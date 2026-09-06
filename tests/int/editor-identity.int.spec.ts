import { describe, expect, it } from 'vitest'

import { ensureCreatorDefaults } from '@/collections/Users/hooks/ensureCreatorDefaults'
import {
  getUserLoginPath,
  isEditorialUser,
  isFanUser,
  isMusicalCreatorUser,
} from '@/utilities/isEditorialUser'

function buildReq() {
  return {
    payload: {
      find: async () => ({
        docs: [],
      }),
    },
  } as any
}

describe('editor identity migration compatibility', () => {
  it('normalizes editorial accounts to userType editor', async () => {
    const result = await ensureCreatorDefaults({
      context: {},
      data: {
        editorAccess: true,
        email: 'editor@oddsound.co',
        name: 'Editor Test',
        role: 'creator',
        username: 'Editor Test',
      },
      operation: 'create',
      req: buildReq(),
    } as any)

    expect(result.editorAccess).toBe(true)
    expect(result.userType).toBe('editor')
    expect(result.accountType).toBeNull()
  })

  it('derives musical userType from accountType for artist and band users', async () => {
    const artist = await ensureCreatorDefaults({
      context: {},
      data: {
        accountType: 'artist',
        email: 'artist@oddsound.co',
        name: 'Artist Test',
        role: 'creator',
        username: 'Artist Test',
      },
      operation: 'create',
      req: buildReq(),
    } as any)

    const band = await ensureCreatorDefaults({
      context: {},
      data: {
        accountType: 'band',
        email: 'band@oddsound.co',
        name: 'Band Test',
        role: 'creator',
        username: 'Band Test',
      },
      operation: 'create',
      req: buildReq(),
    } as any)

    expect(artist.userType).toBe('artist')
    expect(artist.editorAccess).toBe(false)
    expect(band.userType).toBe('band')
    expect(band.editorAccess).toBe(false)
  })

  it('accepts both explicit and legacy editorial identities in helpers', () => {
    expect(
      isEditorialUser({
        role: 'creator',
        userType: 'editor',
      }),
    ).toBe(true)

    expect(
      isEditorialUser({
        editorAccess: true,
        role: 'creator',
        userType: 'creator',
      }),
    ).toBe(true)

    expect(
      isMusicalCreatorUser({
        accountType: 'artist',
        editorAccess: false,
        role: 'creator',
        userType: 'creator',
      }),
    ).toBe(true)

    expect(
      isMusicalCreatorUser({
        role: 'creator',
        userType: 'band',
      }),
    ).toBe(true)

    expect(
      isFanUser({
        role: 'creator',
        userType: 'fan',
      }),
    ).toBe(true)
  })

  it('resolves the correct login path for fan, creator, and admin users', () => {
    expect(
      getUserLoginPath({
        role: 'creator',
        userType: 'fan',
      }),
    ).toBe('/fan/login')

    expect(
      getUserLoginPath({
        role: 'creator',
        userType: 'editor',
      }),
    ).toBe('/dashboard/login')

    expect(
      getUserLoginPath({
        role: 'admin',
      }),
    ).toBe('/dashboard/login')
  })
})
