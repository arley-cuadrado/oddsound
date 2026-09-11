import { NextRequest, NextResponse } from 'next/server'

import { loginOrRegisterConsumerWithGoogle, CONSUMER_GOOGLE_STATE_COOKIE } from '@/utilities/consumerAuth'
import { resolveRequestOrigin } from '@/utilities/getURL'
import { getPayloadTokenCookieOptions } from '@/utilities/payloadAuthCookie'

const CONSUMER_POST_LOGIN_REDIRECT_COOKIE = 'consumer-post-login-redirect'

function buildOAuthRedirect(location: string) {
  const response = NextResponse.redirect(location)

  response.cookies.delete(CONSUMER_GOOGLE_STATE_COOKIE)
  response.cookies.delete(CONSUMER_POST_LOGIN_REDIRECT_COOKIE)
  response.headers.set('Cache-Control', 'no-store, max-age=0')

  return response
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const url = new URL(request.url)
  const requestOrigin = resolveRequestOrigin(request)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const storedState = request.cookies.get(CONSUMER_GOOGLE_STATE_COOKIE)?.value
  const next = request.cookies.get(CONSUMER_POST_LOGIN_REDIRECT_COOKIE)?.value

  if (!code || !state || !storedState || state !== storedState) {
    console.warn(
      JSON.stringify({
        durationMs: Date.now() - startedAt,
        event: 'consumer_google_auth_failed',
        hasCode: Boolean(code),
        hasState: Boolean(state),
        hasStoredState: Boolean(storedState),
        reason: 'invalid-state',
      }),
    )
    return buildOAuthRedirect(`${requestOrigin}/fan/login?auth=invalid-state`)
  }

  try {
    const result = await loginOrRegisterConsumerWithGoogle({ code, serverURL: requestOrigin })

    const redirectPath = next && next.startsWith('/') ? next : '/fan/account'
    const response = buildOAuthRedirect(`${requestOrigin}${redirectPath}`)

    response.cookies.set('payload-token', result.token, await getPayloadTokenCookieOptions())

    console.info(
      JSON.stringify({
        durationMs: Date.now() - startedAt,
        event: 'consumer_google_auth_success',
        redirectPath,
        userID: result.user.id,
      }),
    )

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const reason = message.includes('otra cuenta') ? 'email-conflict' : 'google-failed'

    console.warn(
      JSON.stringify({
        durationMs: Date.now() - startedAt,
        error: message || 'unknown',
        event: 'consumer_google_auth_failed',
        reason,
      }),
    )

    return buildOAuthRedirect(`${requestOrigin}/fan/login?auth=${reason}`)
  }
}
