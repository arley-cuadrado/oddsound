import { beforeEach, describe, expect, it, vi } from 'vitest'

import { revalidateDelete, revalidatePost } from '@/collections/Posts/hooks/revalidatePost'

const revalidatePathMock = vi.fn()
const revalidateTagMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}))

function createPayloadLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  }
}

describe('revalidatePost', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    revalidateTagMock.mockReset()
  })

  it('revalidates both the post path and home when a post is published', () => {
    const logger = createPayloadLogger()

    revalidatePost({
      doc: {
        _status: 'published',
        slug: 'mi-post',
      },
      previousDoc: {
        _status: 'draft',
        slug: 'mi-post',
      },
      req: {
        context: {},
        payload: { logger },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/posts/mi-post')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
    expect(revalidateTagMock).toHaveBeenCalledTimes(2)
  })

  it('revalidates home when a previously published post is unpublished', () => {
    const logger = createPayloadLogger()

    revalidatePost({
      doc: {
        _status: 'draft',
        slug: 'mi-post',
      },
      previousDoc: {
        _status: 'published',
        slug: 'mi-post',
      },
      req: {
        context: {},
        payload: { logger },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/posts/mi-post')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
  })
})

describe('revalidateDelete for posts', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    revalidateTagMock.mockReset()
  })

  it('revalidates both the deleted post path and home', () => {
    const logger = createPayloadLogger()

    revalidateDelete({
      doc: {
        slug: 'mi-post',
      },
      req: {
        context: {},
        payload: { logger },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/posts/mi-post')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
    expect(revalidateTagMock).toHaveBeenCalledTimes(2)
  })
})
