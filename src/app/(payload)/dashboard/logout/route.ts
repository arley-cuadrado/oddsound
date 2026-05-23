import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getServerSideURL } from '@/utilities/getURL'

type MeResponse = {
  user?: {
    role?: null | string
  } | null
}

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  let redirectPath = '/dashboard/login'

  if (token) {
    try {
      const meResponse = await fetch(`${getServerSideURL()}/api/users/me`, {
        cache: 'no-store',
        headers: {
          Authorization: `JWT ${token}`,
        },
      })

      if (meResponse.ok) {
        const { user } = (await meResponse.json()) as MeResponse

        if (user?.role === 'creator') {
          redirectPath = '/creator/login'
        }
      }
    } catch {
      // Fall back to the admin login if the current user cannot be resolved.
    }
  }

  const response = NextResponse.redirect(new URL(redirectPath, getServerSideURL()))

  response.cookies.set('payload-token', '', {
    expires: new Date(0),
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
