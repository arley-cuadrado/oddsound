import canUseDOM from './canUseDOM'

function normalizeURL(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) return ''

  if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')) {
    return trimmedValue.replace(/\/+$/, '')
  }

  const protocol =
    trimmedValue.includes('localhost') || trimmedValue.startsWith('127.0.0.1') ? 'http' : 'https'

  return `${protocol}://${trimmedValue}`.replace(/\/+$/, '')
}

export function resolvePublicServerURL() {
  const candidates = [
    process.env.NEXT_PUBLIC_SERVER_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    'http://localhost:3000',
  ]

  for (const candidate of candidates) {
    if (!candidate) continue

    const normalizedCandidate = normalizeURL(candidate)

    if (normalizedCandidate) return normalizedCandidate
  }

  return 'http://localhost:3000'
}

export const getServerSideURL = () => {
  return resolvePublicServerURL()
}

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  return resolvePublicServerURL()
}
