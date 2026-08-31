import crypto from 'crypto'
import config from '@payload-config'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import { ensureConsumerProfile } from '@/utilities/consumerProfiles'
import { getServerSideURL } from '@/utilities/getURL'
import { CROSS_ACCOUNT_EMAIL_CONFLICT_MESSAGE, findUserByEmail } from '@/utilities/creatorAuth'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
export const CONSUMER_GOOGLE_STATE_COOKIE = 'consumer-google-oauth-state'

type GoogleUserInfo = {
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  sub?: string
}

function resolveOAuthServerURL(value?: null | string) {
  const trimmedValue = value?.trim()

  if (!trimmedValue) return getServerSideURL()

  if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')) {
    return trimmedValue.replace(/\/+$/, '')
  }

  const protocol =
    trimmedValue.includes('localhost') || trimmedValue.startsWith('127.0.0.1') ? 'http' : 'https'

  return `${protocol}://${trimmedValue}`.replace(/\/+$/, '')
}

function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildConsumerUsernameSeed({ email, name }: { email: string; name?: null | string }) {
  const normalizedName = normalizeUsername(name || '')

  if (normalizedName) return normalizedName

  return normalizeUsername(email.split('@')[0] || 'consumer') || 'consumer'
}

function buildConsumerInternalPassword(googleSubjectId: string) {
  const payloadSecret = process.env.PAYLOAD_SECRET || 'oddsound-consumer-secret'

  return crypto
    .createHmac('sha256', payloadSecret)
    .update(`consumer-google:${googleSubjectId}`)
    .digest('hex')
}

export function getGoogleConsumerOAuthConfig(serverURL?: string) {
  const clientID = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectURI =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${resolveOAuthServerURL(serverURL)}/consumer-api/auth/google/callback`

  if (!clientID || !clientSecret) {
    throw new Error('Google consumer auth is not configured yet.')
  }

  return {
    clientID,
    clientSecret,
    redirectURI,
  }
}

export function isGoogleConsumerOAuthConfigured() {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET)
}

export function buildGoogleConsumerAuthorizationURL(state: string, serverURL?: string) {
  const { clientID, redirectURI } = getGoogleConsumerOAuthConfig(serverURL)
  const url = new URL(GOOGLE_AUTH_URL)

  url.searchParams.set('client_id', clientID)
  url.searchParams.set('redirect_uri', redirectURI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'select_account')

  return url.toString()
}

async function exchangeGoogleCode(code: string, serverURL?: string) {
  const { clientID, clientSecret, redirectURI } = getGoogleConsumerOAuthConfig(serverURL)

  const response = await fetch(GOOGLE_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: clientID,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectURI,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Google token exchange failed.')
  }

  return (await response.json()) as {
    access_token?: string
  }
}

async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Google user info request failed.')
  }

  return (await response.json()) as GoogleUserInfo
}

async function findUserByGoogleSubject({
  googleSubjectId,
  payload,
}: {
  googleSubjectId: string
  payload: Payload
}) {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    showHiddenFields: true,
    where: {
      googleSubjectId: {
        equals: googleSubjectId,
      },
    },
  })

  return result.docs[0] || null
}

export async function loginOrRegisterConsumerWithGoogle(args: {
  code: string
  req?: PayloadRequest
  serverURL?: string
}) {
  const payload = await getPayload({ config })
  const payloadReq = args.req || (await createLocalReq({}, payload))
  const tokenResult = await exchangeGoogleCode(args.code, args.serverURL)

  if (!tokenResult.access_token) {
    throw new Error('Google did not return an access token.')
  }

  const googleUser = await fetchGoogleUserInfo(tokenResult.access_token)

  if (!googleUser.sub || !googleUser.email) {
    throw new Error('Google did not return enough user data.')
  }

  const userByGoogle = await findUserByGoogleSubject({
    googleSubjectId: googleUser.sub,
    payload,
  })
  const userByEmail = await findUserByEmail(googleUser.email.trim().toLowerCase(), payload)
  const existingUser = userByGoogle || userByEmail

  if (
    existingUser &&
    existingUser.userType &&
    (existingUser.userType as string) !== 'consumer' &&
    existingUser.userType !== 'fan'
  ) {
    throw new Error(CROSS_ACCOUNT_EMAIL_CONFLICT_MESSAGE)
  }

  const password = buildConsumerInternalPassword(googleUser.sub)
  const email = googleUser.email.trim().toLowerCase()
  const name = googleUser.name?.trim() || googleUser.email.split('@')[0] || 'Fan'

  const user =
    existingUser && typeof existingUser === 'object'
      ? await payload.update({
          collection: 'users',
          id: existingUser.id,
          data: {
            accountType: null,
            authProvider: 'google',
            avatar: googleUser.picture || undefined,
            editorAccess: false,
            email,
            googleSubjectId: googleUser.sub,
            name,
            role: 'creator',
            userType: 'fan',
            username: existingUser.username || buildConsumerUsernameSeed({ email, name }),
            _verified: true,
          } as never,
          depth: 0,
          overrideAccess: true,
          req: payloadReq,
          showHiddenFields: true,
        })
      : await payload.create({
          collection: 'users',
          data: {
            accountType: null,
            authProvider: 'google',
            avatar: googleUser.picture || undefined,
            editorAccess: false,
            email,
            googleSubjectId: googleUser.sub,
            isActive: true,
            name,
            password,
            role: 'creator',
            userType: 'fan',
            username: buildConsumerUsernameSeed({ email, name }),
            _verified: true,
          } as never,
          disableVerificationEmail: true,
          draft: false,
          overrideAccess: true,
          req: payloadReq,
          showHiddenFields: true,
        })

  await ensureConsumerProfile({
    payload,
    req: payloadReq,
    user: {
      avatar: user.avatar || googleUser.picture || undefined,
      consumerProfile: user.consumerProfile,
      email: user.email,
      id: String(user.id),
      name: user.name,
      userType: user.userType,
    },
  })

  const loginResult = await payload.login({
    collection: 'users',
    data: {
      email,
      password,
    },
    req: payloadReq,
  })

  if (!loginResult.token || !loginResult.user) {
    throw new Error('No fue posible iniciar sesión con Google.')
  }

  return {
    token: loginResult.token,
    user: loginResult.user,
  }
}
