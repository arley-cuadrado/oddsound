/**
 * Normalizes text for discovery matching so searches like "mexico" still match
 * stored values like "México". Shared by the server render and the client
 * filtering so both agree on what counts as a match.
 */
export function normalizeSearchValue(value: null | string | undefined) {
  if (!value) return ''

  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}
