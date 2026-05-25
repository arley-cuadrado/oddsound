import configPromise from '@payload-config'

type CookieOptions = {
  domain?: string
  expires: Date
  httpOnly: true
  path: '/'
  sameSite?: 'lax' | 'none' | 'strict'
  secure?: boolean
}

async function getUsersAuthConfig() {
  const config = await configPromise
  const usersCollection = config.collections?.find((collection) => collection.slug === 'users')

  if (!usersCollection?.auth) {
    throw new Error('Users auth config not found.')
  }

  return usersCollection.auth
}

function resolveSameSite(
  sameSite: boolean | 'Lax' | 'None' | 'Strict' | 'lax' | 'none' | 'strict' | undefined,
): CookieOptions['sameSite'] {
  if (typeof sameSite === 'string') {
    return sameSite.toLowerCase() as CookieOptions['sameSite']
  }

  if (sameSite) {
    return 'strict'
  }

  return undefined
}

export async function getPayloadTokenCookieOptions(): Promise<CookieOptions> {
  const authConfig = await getUsersAuthConfig()

  return {
    domain: authConfig.cookies.domain ?? undefined,
    expires: new Date(Date.now() + authConfig.tokenExpiration * 1000),
    httpOnly: true,
    path: '/',
    sameSite: resolveSameSite(authConfig.cookies.sameSite),
    secure: authConfig.cookies.secure,
  }
}

export async function getExpiredPayloadTokenCookieOptions(): Promise<CookieOptions> {
  const authConfig = await getUsersAuthConfig()

  return {
    domain: authConfig.cookies.domain ?? undefined,
    expires: new Date(0),
    httpOnly: true,
    path: '/',
    sameSite: resolveSameSite(authConfig.cookies.sameSite),
    secure: authConfig.cookies.secure,
  }
}
