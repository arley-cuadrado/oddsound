// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertPreviewDatabase, resolveDatabaseURL } from '@/config/preview'
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
  it('selects the explicit Preview database for Atlas templates while preserving credentials and parameters', () => {
    const env = {
      ...preview,
      DATABASE_URL:
        'mongodb+srv://demo:fake%40pass@cluster.example.test/?retryWrites=true&authSource=admin',
    }
    const resolved = new URL(resolveDatabaseURL(env))
    expect(resolved.pathname).toBe('/oddsound_preview_tests')
    expect(resolved.username).toBe('demo')
    expect(resolved.password).toBe('fake%40pass')
    expect(resolved.searchParams.get('authSource')).toBe('admin')
    expect(resolved.searchParams.get('retryWrites')).toBe('true')
    expect(env.DATABASE_URL).toContain('/?')
    expect(resolveDatabaseURL({ VERCEL_ENV: 'production', DATABASE_URL: env.DATABASE_URL })).toBe(
      env.DATABASE_URL,
    )
  })
  it('never rewrites an explicitly different database or accepts a missing isolation declaration', () => {
    expect(() =>
      resolveDatabaseURL({ ...preview, DATABASE_URL: 'mongodb://localhost/oddsound' }),
    ).toThrow(/no puede conectar/)
    expect(() =>
      resolveDatabaseURL({
        ...preview,
        DATABASE_URL: 'mongodb://localhost/',
        PREVIEW_DATABASE_NAME: undefined,
      }),
    ).toThrow(/PREVIEW_DATABASE_NAME/)
    expect(() =>
      resolveDatabaseURL({ ...preview, DATABASE_URL: 'mongodb://localhost/?dbName=oddsound' }),
    ).toThrow(/parámetros/)
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
  it('diagnoses missing values, empty database paths and pasted assignments without exposing credentials', () => {
    expect(() => assertPreviewDatabase({ ...preview, DATABASE_URL: undefined })).toThrow(
      /Falta DATABASE_URL/,
    )
    expect(() =>
      assertPreviewDatabase({
        ...preview,
        DATABASE_URL: 'mongodb+srv://demo:fake@cluster.example.test/',
      }),
    ).toThrow(/no incluye nombre de base/)
    for (const connection of [
      ' DATABASE_URL=mongodb://demo:fake@localhost/test',
      'mongodb://demo:fake@localhost/test ',
    ])
      expect(() => assertPreviewDatabase({ ...preview, DATABASE_URL: connection })).toThrow(
        /sin espacios/,
      )
    expect(() =>
      assertPreviewDatabase({ ...preview, DATABASE_URL: 'mongodb://localhost/oddsound' }),
    ).toThrow(/La URI selecciona oddsound/)
  })
  it('does not echo unknown database paths, usernames, passwords or hosts in diagnostics', () => {
    const sensitive = ['private-user', 'private-password', 'private-host', 'private-path']
    try {
      assertPreviewDatabase({
        ...preview,
        DATABASE_URL: `mongodb://${sensitive[0]}:${sensitive[1]}@${sensitive[2]}/${sensitive[3]}`,
      })
      throw new Error('Expected rejection')
    } catch (error) {
      expect(String(error)).toContain('PREVIEW_DATABASE_NAME=oddsound_preview_tests')
      for (const value of sensitive) expect(String(error)).not.toContain(value)
    }
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
