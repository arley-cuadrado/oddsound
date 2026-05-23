import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import config from '@payload-config'
import { createPayloadRequest } from 'payload'

import type { User } from '../payload-types'
import { getServerSideURL } from './getURL'

export const getMeUser = async (args?: {
  nullUserRedirect?: string
  validUserRedirect?: string
}): Promise<{
  token: string
  user: User
}> => {
  const { nullUserRedirect, validUserRedirect } = args || {}
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    if (nullUserRedirect) {
      redirect(nullUserRedirect)
    }

    throw new Error('No authenticated user found.')
  }

  const request = new Request(`${getServerSideURL()}/api/users/me`, {
    headers: new Headers({
      Authorization: `JWT ${token}`,
      Cookie: `payload-token=${token}`,
      DisableAutologin: 'true',
    }),
  })

  const req = await createPayloadRequest({
    config,
    params: {
      collection: 'users',
    },
    request,
  })

  const user = req.user as User | null

  if (validUserRedirect && user) {
    redirect(validUserRedirect)
  }

  if (nullUserRedirect && !user) {
    redirect(nullUserRedirect)
  }

  if (!user) {
    throw new Error('No authenticated user found.')
  }

  return {
    token,
    user: user as User,
  }
}
