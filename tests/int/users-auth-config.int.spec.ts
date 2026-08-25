import { describe, expect, it } from 'vitest'

import { Users } from '@/collections/Users'
import {
  getTemporaryLoginLockMessage,
  USERS_LOGIN_LOCK_TIME_MS,
  USERS_MAX_LOGIN_ATTEMPTS,
} from '@/utilities/authLocking'

describe('Users auth config', () => {
  it('locks login attempts temporarily instead of indefinitely', () => {
    if (!Users.auth || Users.auth === true) {
      throw new Error('Users auth config not found.')
    }

    expect(Users.auth.maxLoginAttempts).toBe(USERS_MAX_LOGIN_ATTEMPTS)
    expect(Users.auth.lockTime).toBe(USERS_LOGIN_LOCK_TIME_MS)
  })

  it('tells users when the temporary lock will expire', () => {
    expect(getTemporaryLoginLockMessage()).toBe(
      'Este usuario ha sido bloqueado debido a demasiados intentos fallidos de inicio de sesion. Podras intentarlo de nuevo en 10 minutos.',
    )
  })
})
