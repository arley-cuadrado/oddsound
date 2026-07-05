import { describe, expect, it } from 'vitest'

import { metadata as aboutUsMetadata } from '@/app/(frontend)/about-us/page'
import { metadata as homeMetadata } from '@/app/(frontend)/page'
import { generateMetadata as generateSearchMetadata } from '@/app/(frontend)/search/page'
import { metadata as loginMetadata } from '@/app/(creator-auth)/creator/login/page'
import { metadata as registerMetadata } from '@/app/(creator-auth)/creator/register/page'
import {
  ABOUT_US_DESCRIPTION,
  DISCOVERY_DESCRIPTION,
  FOUNDER_NAME,
  getSiteStructuredData,
  HOME_DESCRIPTION,
  INSTAGRAM_URL,
  LOGIN_DESCRIPTION,
  REGISTER_DESCRIPTION,
  STATIC_SITEMAP_PATHS,
} from '@/seo/site'

describe('frontend SEO config', () => {
  it('uses the welcome description for the home metadata', () => {
    expect(homeMetadata.description).toBe(HOME_DESCRIPTION)
  })

  it('localizes discovery, about and auth metadata for crawlable pages', () => {
    const searchMetadata = generateSearchMetadata()

    expect(searchMetadata.description).toBe(DISCOVERY_DESCRIPTION)
    expect(aboutUsMetadata.description).toBe(ABOUT_US_DESCRIPTION)
    expect(loginMetadata.description).toBe(LOGIN_DESCRIPTION)
    expect(registerMetadata.description).toBe(REGISTER_DESCRIPTION)
    expect(loginMetadata.robots).toEqual({
      follow: true,
      index: true,
    })
    expect(registerMetadata.robots).toEqual({
      follow: true,
      index: true,
    })
  })

  it('includes the requested public routes in the static sitemap set', () => {
    expect(STATIC_SITEMAP_PATHS).toEqual(
      expect.arrayContaining(['/', '/about-us', '/search', '/creator/login', '/creator/register']),
    )
  })

  it('exposes the founder Instagram account in structured data', () => {
    const structuredData = getSiteStructuredData()
    const organization = structuredData.find((entry) => entry['@type'] === 'Organization')

    expect(organization).toMatchObject({
      founder: {
        jobTitle: 'Founder / Content Creator',
        name: FOUNDER_NAME,
        sameAs: INSTAGRAM_URL,
      },
      sameAs: [INSTAGRAM_URL],
    })
  })
})
