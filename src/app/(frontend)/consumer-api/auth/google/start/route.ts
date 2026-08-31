import crypto from 'crypto'
import { cookies } from 'next/headers'

import {
  buildGoogleConsumerAuthorizationURL,
  CONSUMER_GOOGLE_STATE_COOKIE,
  isGoogleConsumerOAuthConfigured,
} from '@/utilities/consumerAuth'
import { getServerSideURL, normalizeURL } from '@/utilities/getURL'

const CONSUMER_POST_LOGIN_REDIRECT_COOKIE = 'consumer-post-login-redirect'

export async function GET(request: Request) {
  const url = new URL(request.url || `${getServerSideURL()}/consumer-api/auth/google/start`)
  const next = url.searchParams.get('next')
  const canonicalOrigin = normalizeURL(getServerSideURL())
  const requestOrigin = normalizeURL(url.origin)

  if (!isGoogleConsumerOAuthConfigured()) {
    return Response.redirect(`${getServerSideURL()}/fan/login?auth=missing-config`)
  }

  if (canonicalOrigin && requestOrigin && canonicalOrigin !== requestOrigin) {
    const redirectURL = new URL('/consumer-api/auth/google/start', canonicalOrigin)

    if (next && next.startsWith('/')) {
      redirectURL.searchParams.set('next', next)
    }

    return Response.redirect(redirectURL.toString())
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()

  cookieStore.set(CONSUMER_GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  if (next && next.startsWith('/')) {
    cookieStore.set(CONSUMER_POST_LOGIN_REDIRECT_COOKIE, next, {
      httpOnly: true,
      maxAge: 60 * 10,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  } else {
    cookieStore.delete(CONSUMER_POST_LOGIN_REDIRECT_COOKIE)
  }

  return Response.redirect(buildGoogleConsumerAuthorizationURL(state))
}
