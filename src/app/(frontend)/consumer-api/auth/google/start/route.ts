import crypto from 'crypto'
import { NextResponse } from 'next/server'

import {
  buildGoogleConsumerAuthorizationURL,
  CONSUMER_GOOGLE_STATE_COOKIE,
  isGoogleConsumerOAuthConfigured,
} from '@/utilities/consumerAuth'
import { getServerSideURL, resolveRequestOrigin } from '@/utilities/getURL'

const CONSUMER_POST_LOGIN_REDIRECT_COOKIE = 'consumer-post-login-redirect'

export async function GET(request: Request) {
  const url = new URL(request.url || `${getServerSideURL()}/consumer-api/auth/google/start`)
  const next = url.searchParams.get('next')
  const requestOrigin = resolveRequestOrigin(request)

  if (!isGoogleConsumerOAuthConfigured()) {
    return Response.redirect(`${requestOrigin}/fan/login?auth=missing-config`)
  }

  const state = crypto.randomUUID()
  const response = NextResponse.redirect(buildGoogleConsumerAuthorizationURL(state, requestOrigin))

  response.cookies.set(CONSUMER_GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  if (next && next.startsWith('/')) {
    response.cookies.set(CONSUMER_POST_LOGIN_REDIRECT_COOKIE, next, {
      httpOnly: true,
      maxAge: 60 * 10,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  } else {
    response.cookies.delete(CONSUMER_POST_LOGIN_REDIRECT_COOKIE)
  }

  response.headers.set('Cache-Control', 'no-store, max-age=0')

  return response
}
