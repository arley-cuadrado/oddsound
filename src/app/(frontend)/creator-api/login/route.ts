import config from '@payload-config'
import { cookies } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'
import { getPayloadTokenCookieOptions } from '@/utilities/payloadAuthCookie'

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const body = (await request.json()) as LoginBody

    if (!body.email || !body.password) {
      return Response.json({ message: 'Email and password are required.' }, { status: 400 })
    }

    const payloadReq = await createLocalReq({}, payload)

    const result = await payload.login({
      collection: 'users',
      data: {
        email: body.email.trim().toLowerCase(),
        password: body.password,
      },
      req: payloadReq,
    })

    if (!result.token || !result.user) {
      return Response.json({ message: 'Unable to log in.' }, { status: 401 })
    }

    const cookieStore = await cookies()

    cookieStore.set('payload-token', result.token, await getPayloadTokenCookieOptions())

    return Response.json({
      message: 'Login successful.',
      user: result.user,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'UnverifiedEmail') {
      return Response.json(
        { message: 'You need to verify your email before logging in.' },
        { status: 403 },
      )
    }

    const message = error instanceof Error ? error.message : 'Unable to log in.'

    return Response.json({ message }, { status: 401 })
  }
}
