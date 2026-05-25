import { cookies } from 'next/headers'
import { getExpiredPayloadTokenCookieOptions } from '@/utilities/payloadAuthCookie'

export async function POST() {
  const cookieStore = await cookies()

  cookieStore.set('payload-token', '', await getExpiredPayloadTokenCookieOptions())

  return Response.json({ message: 'Logged out successfully.' })
}
