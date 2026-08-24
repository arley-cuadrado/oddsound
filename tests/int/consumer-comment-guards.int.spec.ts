import { describe, expect, it, vi } from 'vitest'

import { validateConsumerCommentSubmission } from '@/utilities/consumerCommentGuards'

describe('validateConsumerCommentSubmission', () => {
  it('allows submission when there are no recent comments', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [],
      }),
    }

    await expect(
      validateConsumerCommentSubmission({
        consumerProfileID: 'consumer-profile-1',
        content: 'Nuevo comentario',
        payload: payload as never,
        releaseID: 'release-1',
      }),
    ).resolves.toEqual({ ok: true })
  })

  it('blocks rapid repeated comments on the same release', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            content: 'Primer comentario',
            createdAt: new Date(Date.now() - 5_000).toISOString(),
          },
        ],
      }),
    }

    const result = await validateConsumerCommentSubmission({
      consumerProfileID: 'consumer-profile-1',
      content: 'Segundo comentario',
      payload: payload as never,
      releaseID: 'release-1',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('cooldown')
    }
  })

  it('blocks duplicate comments inside the duplicate window', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            content: '  Me gustó mucho este release  ',
            createdAt: new Date(Date.now() - 90_000).toISOString(),
          },
        ],
      }),
    }

    const result = await validateConsumerCommentSubmission({
      consumerProfileID: 'consumer-profile-1',
      content: 'me gustó mucho este release',
      payload: payload as never,
      releaseID: 'release-1',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('duplicate')
    }
  })
})
