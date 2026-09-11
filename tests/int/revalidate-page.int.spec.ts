import { describe, expect, it, vi, beforeEach } from 'vitest'

import { revalidateDelete, revalidatePage } from '@/collections/Pages/hooks/revalidatePage'

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

describe('revalidatePage', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    revalidateTagMock.mockReset()
  })

  it('revalidates release, bio, releases listing and home when a release is published', async () => {
    const logger = createPayloadLogger()

    await revalidatePage({
      doc: {
        _status: 'published',
        profile: {
          slug: 'forte-marea',
        },
        slug: 'mi-release',
      },
      previousDoc: {
        _status: 'draft',
        profile: {
          slug: 'forte-marea',
        },
        slug: 'mi-release',
      },
      req: {
        context: {},
        payload: { findByID: vi.fn(), logger },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/mi-release')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
    expect(revalidatePathMock).toHaveBeenCalledWith('/forte-marea/bio')
    expect(revalidatePathMock).toHaveBeenCalledWith('/forte-marea/releases')
    expect(revalidatePathMock).toHaveBeenCalledWith('/forte-marea/release/mi-release')
  })

  it('revalidates bio, release detail and home when a previously published release is unpublished', async () => {
    const logger = createPayloadLogger()

    await revalidatePage({
      doc: {
        _status: 'draft',
        profile: {
          slug: 'forte-marea',
        },
        slug: 'mi-release',
      },
      previousDoc: {
        _status: 'published',
        profile: {
          slug: 'forte-marea',
        },
        slug: 'mi-release',
      },
      req: {
        context: {},
        payload: { findByID: vi.fn(), logger },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/mi-release')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
    expect(revalidatePathMock).toHaveBeenCalledWith('/forte-marea/bio')
    expect(revalidatePathMock).toHaveBeenCalledWith('/forte-marea/releases')
    expect(revalidatePathMock).toHaveBeenCalledWith('/forte-marea/release/mi-release')
  })
})

describe('revalidateDelete', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    revalidateTagMock.mockReset()
  })

  it('revalidates deleted release, bio, releases listing and home', async () => {
    const logger = createPayloadLogger()

    await revalidateDelete({
      doc: {
        profile: {
          slug: 'forte-marea',
        },
        slug: 'mi-release',
      },
      req: {
        context: {},
        payload: { findByID: vi.fn(), logger },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/mi-release')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
    expect(revalidatePathMock).toHaveBeenCalledWith('/forte-marea/bio')
    expect(revalidatePathMock).toHaveBeenCalledWith('/forte-marea/releases')
    expect(revalidatePathMock).toHaveBeenCalledWith('/forte-marea/release/mi-release')
  })
})
