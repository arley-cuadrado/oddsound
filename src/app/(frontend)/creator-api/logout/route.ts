import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()

  cookieStore.set('payload-token', '', {
    expires: new Date(0),
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return Response.json({ message: 'Logged out successfully.' })
}
