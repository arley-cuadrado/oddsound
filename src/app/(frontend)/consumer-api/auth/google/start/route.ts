import crypto from 'crypto'
import { cookies } from 'next/headers'

import {
  buildGoogleConsumerAuthorizationURL,
  CONSUMER_GOOGLE_STATE_COOKIE,
  isGoogleConsumerOAuthConfigured,
} from '@/utilities/consumerAuth'
import { getServerSideURL } from '@/utilities/getURL'

const CONSUMER_POST_LOGIN_REDIRECT_COOKIE = 'consumer-post-login-redirect'

export async function GET() {
  const url = new URL(arguments[0]?.url || `${getServerSideURL()}/consumer-api/auth/google/start`)
  const next = url.searchParams.get('next')

  if (!isGoogleConsumerOAuthConfigured()) {
    return Response.redirect(`${getServerSideURL()}/fan/login?auth=missing-config`)
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
