import { describe, expect, it } from 'vitest'

import { payloadDashboardAccess } from '@/access/payloadDashboardAccess'
import { Media } from '@/collections/Media'
import { Users } from '@/collections/Users'

const fanUser = {
  editorAccess: false,
  id: 'fan-1',
  role: 'creator' as const,
  userType: 'fan' as const,
}

const artistUser = {
  editorAccess: false,
  id: 'artist-1',
  role: 'creator' as const,
  userType: 'creator' as const,
}

describe('fan security restrictions', () => {
  it('blocks fan users from Payload dashboard access', () => {
    expect(payloadDashboardAccess({ req: { user: fanUser } } as never)).toBe(false)
    expect(Users.access?.admin?.({ req: { user: fanUser } } as never)).toBe(false)
  })

  it('blocks fan users from creating media assets', () => {
    expect(Media.access?.create?.({ req: { user: fanUser } } as never)).toBe(false)
  })

  it('keeps static media files readable so public frontend images do not break for logged-in fans', async () => {
    await expect(
      Media.access?.read?.({ isReadingStaticFile: true, req: { user: fanUser } } as never),
    ).resolves.toBe(true)
  })

  it('keeps dashboard media documents scoped to the owner for artist accounts', async () => {
    await expect(Media.access?.read?.({ req: { user: artistUser } } as never)).resolves.toEqual({
      owner: {
        equals: artistUser.id,
      },
    })
  })

  it('hides media collection from fan users in admin navigation', () => {
    const hidden = Media.admin?.hidden as (args: { user: unknown }) => boolean

    expect(hidden({ user: fanUser })).toBe(true)
  })
})
