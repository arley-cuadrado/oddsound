import { describe, expect, it } from 'vitest'

import { generateCreatorVerificationEmailHTML } from '@/utilities/emailVerification'

describe('verification email hero styles', () => {
  it('keeps hero copy and photographer credits white for mobile and dark mode clients', () => {
    const html = generateCreatorVerificationEmailHTML({
      token: 'test-token',
      user: {
        email: 'demo@oddsound.co',
        name: 'ARTISTA TEST',
      },
    })

    expect(html).toContain('class="hero-title"')
    expect(html).toContain('class="hero-tagline"')
    expect(html).toContain('class="hero-credit-label"')
    expect(html).toContain('class="hero-credit-name"')
    expect(html).toContain('-webkit-text-fill-color: #ffffff !important;')
    expect(html).toContain('@media (prefers-color-scheme: dark)')
    expect(html).toContain('[data-ogsc] .hero-title')
  })
})
