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

  it('uses the current request origin for verification links when available', () => {
    const html = generateCreatorVerificationEmailHTML({
      req: {
        headers: new Headers({
          'x-forwarded-host': 'oddsound-preview.vercel.app',
          'x-forwarded-proto': 'https',
        }),
      },
      token: 'preview-token',
      user: {
        email: 'preview@oddsound.co',
        name: 'Preview Artist',
      },
    })

    expect(html).toContain(
      'https://oddsound-preview.vercel.app/creator/verify?email=preview%40oddsound.co&amp;token=preview-token',
    )
  })

  it('uses the artist account confirmation copy', () => {
    const html = generateCreatorVerificationEmailHTML({
      token: 'test-token',
      user: {
        email: 'artist@oddsound.co',
        name: 'Artista',
      },
    })

    expect(html).toContain(
      'Ya casi activas tu cuenta de artista en oddsound, para hacerlo solo debes confirmar este correo. Luego podrás acceder al panel de usuario y comenzar a crear lanzamientos.',
    )
  })
})
