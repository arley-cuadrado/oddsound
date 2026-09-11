/** Every seeded account lives here so cleanup can find its data by ownership. */
export const SEED_EMAIL_DOMAIN = 'seed.oddsound.test'
export const SEED_PASSWORD = 'oddsound123'
export const SEED_ADMIN_EMAIL = `admin@${SEED_EMAIL_DOMAIN}`

/**
 * Fixed reference date. Publish dates are derived from it instead of `Date.now()`
 * so two runs on different days produce identical documents.
 */
export const SEED_BASE_DATE = new Date('2026-08-20T12:00:00.000Z')

export function seedEmail(slug: string) {
  return `${slug}@${SEED_EMAIL_DOMAIN}`
}

/** Publish dates walk backwards from the reference date, three days apart. */
export function seedPublishedAt(index: number) {
  return new Date(SEED_BASE_DATE.getTime() - index * 3 * 24 * 60 * 60 * 1000).toISOString()
}
