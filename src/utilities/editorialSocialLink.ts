export function formatEditorialSocialHandle(label: null | string | undefined) {
  const handle = label?.trim()

  if (!handle || handle === '@') return ''

  return handle.startsWith('@') ? handle : `@${handle}`
}
