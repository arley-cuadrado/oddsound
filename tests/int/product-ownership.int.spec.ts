import { describe, expect, it, vi } from 'vitest'

import { assignProductOwnership } from '@/collections/Products/hooks/assignProductOwnership'

describe('assignProductOwnership', () => {
  it('assigns owner and profile automatically for creators', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [{ id: 'profile-1' }],
      }),
    }

    await expect(
      assignProductOwnership({
        data: {
          title: 'Producto demo',
        },
        req: {
          payload,
          user: {
            id: 'user-1',
            role: 'creator',
          },
        },
      } as never),
    ).resolves.toEqual({
      owner: 'user-1',
      profile: 'profile-1',
      title: 'Producto demo',
    })
  })

  it('does not overwrite ownership fields for admins', async () => {
    await expect(
      assignProductOwnership({
        data: {
          owner: 'creator-2',
          profile: 'profile-2',
          title: 'Producto admin',
        },
        req: {
          payload: {
            find: vi.fn(),
          },
          user: {
            id: 'admin-1',
            role: 'admin',
          },
        },
      } as never),
    ).resolves.toEqual({
      owner: 'creator-2',
      profile: 'profile-2',
      title: 'Producto admin',
    })
  })
})
