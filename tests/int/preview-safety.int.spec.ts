// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertPreviewDatabase } from '@/config/preview'
import { payoutsAPI, wompiAPI, wompiEnvironment } from '@/commerce/wompi'
import { collectTrustedServerURLs } from '@/utilities/getURL'

afterEach(() => vi.unstubAllEnvs())
describe('Preview isolation boundaries', () => {
  const preview = {
    VERCEL_ENV: 'preview',
    PREVIEW_DATABASE_NAME: 'oddsound_preview_tests',
    DATABASE_URL: 'mongodb://preview:fake@localhost/oddsound_preview_tests',
  }
  it('allows an explicitly named preview database and leaves production configuration alone', () => {
    expect(() => assertPreviewDatabase(preview)).not.toThrow()
    expect(() =>
      assertPreviewDatabase({
        VERCEL_ENV: 'production',
        DATABASE_URL: 'mongodb://localhost/oddsound',
      }),
    ).not.toThrow()
  })
  it('rejects missing guards, the production namespace and a different authenticated user', () => {
    expect(() => assertPreviewDatabase({ ...preview, PREVIEW_DATABASE_NAME: undefined })).toThrow(
      /PREVIEW_DATABASE_NAME/,
    )
    expect(() =>
      assertPreviewDatabase({ ...preview, DATABASE_URL: 'mongodb://localhost/oddsound' }),
    ).toThrow(/no puede conectar/)
    expect(() => assertPreviewDatabase({ ...preview, PREVIEW_DATABASE_NAME: 'oddsound' })).toThrow(
      /exclusivo/,
    )
    expect(() =>
      assertPreviewDatabase({ ...preview, PREVIEW_DATABASE_USER: 'dedicated-user' }),
    ).toThrow(/usuario/)
  })
  it('prevents productive Wompi configuration and all bank dispersions in Preview', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('WOMPI_ENVIRONMENT', 'production')
    expect(wompiEnvironment).toThrow(/Sandbox/)
    vi.stubEnv('WOMPI_ENVIRONMENT', 'sandbox')
    vi.stubEnv('WOMPI_PRIVATE_KEY', 'prv_prod_not-a-real-key')
    expect(wompiAPI).toThrow(/productivas/)
    await expect(payoutsAPI('/payments', { amount: 1 })).rejects.toThrow(/deshabilitadas/)
  })
  it('does not trust the production origin as a Preview fallback', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://preview.example.test')
    vi.stubEnv('VERCEL_URL', 'preview.example.test')
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'production.example.test')
    expect(collectTrustedServerURLs()).toContain('https://preview.example.test')
    expect(collectTrustedServerURLs()).not.toContain('https://production.example.test')
  })
})
