import { describe, expect, it } from 'vitest'

import {
  extractLegacySocialLinks,
  normalizeSocialLinksWithLegacy,
} from '@/utilities/socialLinks'

describe('legacy social links compatibility', () => {
  it('extracts social links from the legacy social media layout block', () => {
    const socialLinks = extractLegacySocialLinks([
      {
        blockType: 'content',
      },
      {
        blockType: 'socialMediaBlock',
        socialLinks: [
          {
            platform: 'Instagram',
            url: 'https://instagram.com/oddsound',
          },
          {
            platform: ' Spotify ',
            url: ' https://spotify.com/artist/123 ',
          },
        ],
      },
    ])

    expect(socialLinks).toEqual([
      {
        platform: 'Instagram',
        url: 'https://instagram.com/oddsound',
      },
      {
        platform: 'Spotify',
        url: 'https://spotify.com/artist/123',
      },
    ])
  })

  it('falls back to legacy social links when the new tab is still empty', () => {
    const doc = normalizeSocialLinksWithLegacy({
      layout: [
        {
          blockType: 'socialMediaBlock',
          socialLinks: [
            {
              platform: 'Bandcamp',
              url: 'https://bandcamp.com/oddsound',
            },
          ],
        },
      ],
      socialLinks: [],
    })

    expect(doc.socialLinks).toEqual([
      {
        platform: 'Bandcamp',
        url: 'https://bandcamp.com/oddsound',
      },
    ])
  })

  it('keeps the new social tab as the source of truth when it already has data', () => {
    const doc = normalizeSocialLinksWithLegacy({
      layout: [
        {
          blockType: 'socialMediaBlock',
          socialLinks: [
            {
              platform: 'Instagram',
              url: 'https://instagram.com/legacy',
            },
          ],
        },
      ],
      socialLinks: [
        {
          platform: 'TikTok',
          url: 'https://tiktok.com/@oddsound',
        },
      ],
    })

    expect(doc.socialLinks).toEqual([
      {
        platform: 'TikTok',
        url: 'https://tiktok.com/@oddsound',
      },
    ])
  })
})
