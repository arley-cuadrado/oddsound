const MAX_ATTEMPTS = 5
const BASE_DELAY_MS = 120

/**
 * MongoDB raises transient transaction errors when a write races with catalog
 * changes — index builds on a cold database, mostly. The server explicitly asks
 * the client to retry these, and Payload does not, so the seed does it here.
 */
function isTransient(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return /catalog changes|please retry|TransientTransactionError|WriteConflict|Unable to acquire .* lock/i.test(
    message,
  )
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!isTransient(error)) throw error

      lastError = error

      if (attempt < MAX_ATTEMPTS) {
        await wait(BASE_DELAY_MS * 2 ** (attempt - 1))
      }
    }
  }

  throw lastError
}
