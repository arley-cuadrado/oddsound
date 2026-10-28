type PreviewEnvironment = Record<string, string | undefined>

export function isPreviewEnvironment(env: PreviewEnvironment = process.env) {
  return env.VERCEL_ENV === 'preview'
}

/** Fail before Payload opens a connection. Database permissions remain the authoritative boundary. */
export function assertPreviewDatabase(env: PreviewEnvironment = process.env) {
  if (!isPreviewEnvironment(env)) return
  const expected = env.PREVIEW_DATABASE_NAME
  if (!expected || !/^oddsound_preview(?:_[a-z0-9]+)*$/.test(expected))
    throw new Error('Preview requiere PREVIEW_DATABASE_NAME con un nombre exclusivo de pruebas.')
  let url: URL
  try {
    url = new URL(env.DATABASE_URL || '')
  } catch {
    throw new Error('DATABASE_URL de Preview no es válida.')
  }
  if (
    !['mongodb:', 'mongodb+srv:'].includes(url.protocol) ||
    decodeURIComponent(url.pathname.slice(1)) !== expected
  )
    throw new Error('Preview no puede conectar a una base distinta de PREVIEW_DATABASE_NAME.')
  for (const [key, value] of url.searchParams)
    if (key.toLowerCase() === 'dbname' && value !== expected)
      throw new Error('Preview no permite redirigir la base mediante parámetros de conexión.')
  if (env.PREVIEW_DATABASE_USER && decodeURIComponent(url.username) !== env.PREVIEW_DATABASE_USER)
    throw new Error('Preview requiere su usuario de MongoDB exclusivo.')
}
