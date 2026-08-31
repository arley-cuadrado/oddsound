import { cookies } from 'next/headers'

import { loginOrRegisterConsumerWithGoogle, CONSUMER_GOOGLE_STATE_COOKIE } from '@/utilities/consumerAuth'
import { getServerSideURL } from '@/utilities/getURL'
import { getPayloadTokenCookieOptions } from '@/utilities/payloadAuthCookie'

const CONSUMER_POST_LOGIN_REDIRECT_COOKIE = 'consumer-post-login-redirect'

export async function GET(request: Request) {
  const startedAt = Date.now()
  const cookieStore = await cookies()
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const storedState = cookieStore.get(CONSUMER_GOOGLE_STATE_COOKIE)?.value
  const next = cookieStore.get(CONSUMER_POST_LOGIN_REDIRECT_COOKIE)?.value

  cookieStore.delete(CONSUMER_GOOGLE_STATE_COOKIE)
  cookieStore.delete(CONSUMER_POST_LOGIN_REDIRECT_COOKIE)

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
    return Response.redirect(`${getServerSideURL()}/fan/login?auth=invalid-state`)
  }

  try {
    const result = await loginOrRegisterConsumerWithGoogle({ code })

    cookieStore.set('payload-token', result.token, await getPayloadTokenCookieOptions())

    const redirectPath = next && next.startsWith('/') ? next : '/fan/account'

    console.info(
      JSON.stringify({
        durationMs: Date.now() - startedAt,
        event: 'consumer_google_auth_success',
        redirectPath,
        userID: result.user.id,
      }),
    )

    return Response.redirect(`${getServerSideURL()}${redirectPath}`)
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

    return Response.redirect(`${getServerSideURL()}/fan/login?auth=${reason}`)
  }
}
