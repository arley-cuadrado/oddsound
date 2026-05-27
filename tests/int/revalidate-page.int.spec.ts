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

  it('revalidates both the release path and home when a release is published', () => {
    const logger = createPayloadLogger()

    revalidatePage({
      doc: {
        _status: 'published',
        slug: 'mi-release',
      },
      previousDoc: {
        _status: 'draft',
        slug: 'mi-release',
      },
      req: {
        context: {},
        payload: { logger },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/mi-release')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
    expect(revalidateTagMock).toHaveBeenCalledTimes(2)
  })

  it('revalidates home when a previously published release is unpublished', () => {
    const logger = createPayloadLogger()

    revalidatePage({
      doc: {
        _status: 'draft',
        slug: 'mi-release',
      },
      previousDoc: {
        _status: 'published',
        slug: 'mi-release',
      },
      req: {
        context: {},
        payload: { logger },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/mi-release')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
  })
})

describe('revalidateDelete', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    revalidateTagMock.mockReset()
  })

  it('revalidates both the deleted release path and home', () => {
    const logger = createPayloadLogger()

    revalidateDelete({
      doc: {
        slug: 'mi-release',
      },
      req: {
        context: {},
        payload: { logger },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/mi-release')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
    expect(revalidateTagMock).toHaveBeenCalledTimes(2)
  })
})
