export const USERS_MAX_LOGIN_ATTEMPTS = 5
export const USERS_LOGIN_LOCK_TIME_MS = 10 * 60 * 1000

export function getTemporaryLoginLockMessage(lockTimeMs = USERS_LOGIN_LOCK_TIME_MS) {
  const minutes = Math.max(1, Math.round(lockTimeMs / (60 * 1000)))

  return `Este usuario ha sido bloqueado debido a demasiados intentos fallidos de inicio de sesion. Podras intentarlo de nuevo en ${minutes} minutos.`
}
