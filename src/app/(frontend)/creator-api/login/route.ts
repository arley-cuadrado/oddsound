import { cookies } from 'next/headers'

import { getPayloadTokenCookieOptions } from '@/utilities/payloadAuthCookie'
import { loginCreatorAccount } from '@/utilities/creatorAuth'

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as LoginBody

  if (!body.email || !body.password) {
    return Response.json({ message: 'Email and password are required.' }, { status: 400 })
  }

  const result = await loginCreatorAccount({
    email: body.email,
    password: body.password,
  })

  if (!result.ok || !result.token || !result.user) {
    const status = result.status === 'pending_verification' ? 403 : 401

    return Response.json({ message: result.message }, { status })
  }

  const cookieStore = await cookies()

  cookieStore.set('payload-token', result.token, await getPayloadTokenCookieOptions())

  return Response.json({
    message: 'Login successful.',
    user: result.user,
  })
}
