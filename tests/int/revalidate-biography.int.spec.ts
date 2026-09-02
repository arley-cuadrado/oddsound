import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  revalidateBiography,
  revalidateBiographyDelete,
} from '@/collections/Biographies/hooks/revalidateBiography'

const revalidatePathMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

function createPayloadLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  }
}

describe('revalidateBiography', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
  })

  it('revalidates the profile bio path when a biography is saved', async () => {
    const logger = createPayloadLogger()

    await revalidateBiography({
      doc: {
        profile: {
          slug: 'fleet-foxes',
        },
      },
      previousDoc: {
        profile: {
          slug: 'fleet-foxes',
        },
      },
      req: {
        context: {},
        payload: {
          find: vi.fn().mockResolvedValue({ docs: [{ slug: 'first-release' }] }),
          findByID: vi.fn(),
          logger,
        },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/fleet-foxes/bio')
    expect(revalidatePathMock).toHaveBeenCalledWith('/fleet-foxes/releases')
    expect(revalidatePathMock).toHaveBeenCalledWith('/fleet-foxes/release/first-release')
  })

  it('revalidates the previous and next bio paths if the linked profile changes', async () => {
    const logger = createPayloadLogger()

    await revalidateBiography({
      doc: {
        profile: {
          slug: 'new-band',
        },
      },
      previousDoc: {
        profile: {
          slug: 'old-band',
        },
      },
      req: {
        context: {},
        payload: {
          findByID: vi.fn(),
          logger,
        },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/old-band/bio')
    expect(revalidatePathMock).toHaveBeenCalledWith('/new-band/bio')
  })
})

describe('revalidateBiographyDelete', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
  })

  it('revalidates the profile bio path when a biography is deleted', async () => {
    const logger = createPayloadLogger()

    await revalidateBiographyDelete({
      doc: {
        profile: {
          slug: 'fleet-foxes',
        },
      },
      req: {
        context: {},
        payload: {
          findByID: vi.fn(),
          logger,
        },
      },
    } as never)

    expect(revalidatePathMock).toHaveBeenCalledWith('/fleet-foxes/bio')
  })
})
