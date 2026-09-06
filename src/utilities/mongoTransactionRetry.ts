const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 120

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** MongoDB asks clients to retry these short-lived transaction conflicts. */
export function isRetryableMongoTransactionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const labels =
    error && typeof error === 'object' && 'errorLabels' in error
      ? (error as { errorLabels?: unknown }).errorLabels
      : undefined

  return (
    (Array.isArray(labels) && labels.includes('TransientTransactionError')) ||
    /Transaction with \{\s*txnNumber:\s*\d+\s*\} has been aborted|catalog changes|please retry|TransientTransactionError|WriteConflict|Unable to acquire .* lock/i.test(
      message,
    )
  )
}

export async function withMongoTransactionRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!isRetryableMongoTransactionError(error)) throw error

      lastError = error

      if (attempt < MAX_ATTEMPTS) {
        await wait(BASE_DELAY_MS * 2 ** (attempt - 1))
      }
    }
  }

  throw lastError
}
