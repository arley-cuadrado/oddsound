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
  const connection = env.DATABASE_URL || ''
  if (!connection)
    throw new Error(
      'Falta DATABASE_URL para esta rama Preview. Revisa el entorno y la rama de la variable.',
    )
  if (connection !== connection.trim() || !/^mongodb(?:\+srv)?:\/\//.test(connection))
    throw new Error(
      'DATABASE_URL debe comenzar con mongodb:// o mongodb+srv://, sin espacios, comillas ni DATABASE_URL= delante.',
    )
  let url: URL
  try {
    url = new URL(connection)
  } catch {
    throw new Error('DATABASE_URL de Preview no es válida.')
  }
  let database: string
  try {
    database = decodeURIComponent(url.pathname.slice(1))
  } catch {
    throw new Error('El nombre de la base en DATABASE_URL tiene una codificación inválida.')
  }
  if (!database)
    throw new Error(
      `DATABASE_URL no incluye nombre de base: añade /${expected} después del host y antes de ?. PREVIEW_DATABASE_NAME=${expected}.`,
    )
  if (database !== expected) {
    // Only names of known application databases may enter logs. Malformed URI
    // paths can contain credentials: never echo arbitrary paths or the full URI.
    const selected = /^oddsound(?:_preview(?:_[a-z0-9]+)*)?$/.test(database)
      ? ` La URI selecciona ${database}.`
      : ''
    throw new Error(
      `Preview no puede conectar a una base distinta de PREVIEW_DATABASE_NAME=${expected}.${selected} Revisa el nombre después del host y antes de ?.`,
    )
  }
  for (const [key, value] of url.searchParams)
    if (key.toLowerCase() === 'dbname' && value !== expected)
      throw new Error('Preview no permite redirigir la base mediante parámetros de conexión.')
  if (env.PREVIEW_DATABASE_USER && decodeURIComponent(url.username) !== env.PREVIEW_DATABASE_USER)
    throw new Error('Preview requiere su usuario de MongoDB exclusivo.')
}
