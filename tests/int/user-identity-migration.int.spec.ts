import { describe, expect, it } from 'vitest'

import { getUserIdentityMigrationPatch } from '@/utilities/userIdentityMigration'

describe('user identity migration patch', () => {
  it('promotes legacy editorial users to explicit editor userType', () => {
    expect(
      getUserIdentityMigrationPatch({
        accountType: null,
        editorAccess: true,
        id: 'user-1',
        role: 'creator',
        userType: 'creator',
      }),
    ).toEqual({
      userType: 'editor',
    })
  })

  it('clears musical accountType from editorial users during migration', () => {
    expect(
      getUserIdentityMigrationPatch({
        accountType: 'artist',
        editorAccess: true,
        id: 'user-2',
        role: 'creator',
        userType: 'creator',
      }),
    ).toEqual({
      accountType: null,
      userType: 'editor',
    })
  })

  it('aligns legacy musical creators with their accountType', () => {
    expect(
      getUserIdentityMigrationPatch({
        accountType: 'band',
        editorAccess: false,
        id: 'user-3',
        role: 'creator',
        userType: 'creator',
      }),
    ).toEqual({
      userType: 'band',
    })
  })

  it('normalizes legacy consumer userType to fan and clears accountType', () => {
    expect(
      getUserIdentityMigrationPatch({
        accountType: 'artist',
        editorAccess: false,
        id: 'user-4',
        role: 'creator',
        userType: 'consumer',
      }),
    ).toEqual({
      accountType: null,
      userType: 'fan',
    })
  })

  it('leaves already normalized users untouched', () => {
    expect(
      getUserIdentityMigrationPatch({
        accountType: null,
        editorAccess: true,
        id: 'user-5',
        role: 'creator',
        userType: 'editor',
      }),
    ).toBeNull()

    expect(
      getUserIdentityMigrationPatch({
        accountType: 'artist',
        editorAccess: false,
        id: 'user-6',
        role: 'creator',
        userType: 'artist',
      }),
    ).toBeNull()
  })
})
