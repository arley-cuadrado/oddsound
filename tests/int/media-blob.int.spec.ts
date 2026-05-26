import { describe, expect, it } from 'vitest'

import type { Page, Profile } from '@/payload-types'
import { getBlobRangeRequestInfo } from '@/plugins/blobRange'
import { getReleaseCardImage } from '@/utilities/getReleaseCardImage'

function buildMedia(url: string) {
  return {
    id: url,
    updatedAt: '2026-05-26T00:00:00.000Z',
    url,
  } as any
}

function buildPage(type: 'highImpact' | 'lowImpact' | 'mediumImpact', overrides?: Partial<Page>) {
  return {
    id: 'page-1',
    slug: 'release-slug',
    title: 'Release title',
    hero: {
      type,
      albumImage: buildMedia('https://cdn.oddsound.test/album.jpg'),
      media: buildMedia('https://cdn.oddsound.test/hero.jpg'),
    },
    meta: {
      image: buildMedia('https://cdn.oddsound.test/meta.jpg'),
    },
    ...overrides,
  } as Page
}

function buildProfile(overrides?: Partial<Profile>) {
  return {
    id: 'profile-1',
    coverImage: buildMedia('https://cdn.oddsound.test/cover.jpg'),
    avatar: buildMedia('https://cdn.oddsound.test/avatar.jpg'),
    ...overrides,
  } as Profile
}

describe('release card image policy', () => {
  it('uses albumImage first for low impact releases', () => {
    const imageUrl = getReleaseCardImage({
      page: buildPage('lowImpact'),
      profile: buildProfile(),
    })

    expect(imageUrl).toBe('https://cdn.oddsound.test/album.jpg?2026-05-26T00%3A00%3A00.000Z')
  })

  it('uses hero media first for medium impact releases', () => {
    const imageUrl = getReleaseCardImage({
      page: buildPage('mediumImpact'),
      profile: buildProfile(),
    })

    expect(imageUrl).toBe('https://cdn.oddsound.test/hero.jpg?2026-05-26T00%3A00%3A00.000Z')
  })

  it('falls back to profile cover when low impact album image is missing', () => {
    const imageUrl = getReleaseCardImage({
      page: buildPage('lowImpact', {
        hero: {
          type: 'lowImpact',
          albumImage: null,
        } as any,
        meta: {
          image: null,
        } as any,
      }),
      profile: buildProfile(),
    })

    expect(imageUrl).toBe('https://cdn.oddsound.test/cover.jpg?2026-05-26T00%3A00%3A00.000Z')
  })
})

describe('blob range parsing', () => {
  it('returns full response metadata when no range is requested', () => {
    const result = getBlobRangeRequestInfo({
      fileSize: 1000,
      rangeHeader: null,
    })

    expect(result).toEqual({
      headers: {
        'Accept-Ranges': 'bytes',
      },
      status: 200,
      type: 'full',
    })
  })

  it('parses a valid partial byte range', () => {
    const result = getBlobRangeRequestInfo({
      fileSize: 1000,
      rangeHeader: 'bytes=100-199',
    })

    expect(result).toEqual({
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': '100',
        'Content-Range': 'bytes 100-199/1000',
      },
      rangeEnd: 199,
      rangeStart: 100,
      status: 206,
      type: 'partial',
    })
  })

  it('rejects invalid ranges with a 416 response', () => {
    const result = getBlobRangeRequestInfo({
      fileSize: 1000,
      rangeHeader: 'bytes=2000-3000',
    })

    expect(result).toEqual({
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes */1000',
      },
      status: 416,
      type: 'invalid',
    })
  })
})

