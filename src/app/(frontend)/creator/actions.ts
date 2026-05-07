'use server'

import config from '@payload-config'
import { cookies } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

type AccountType = 'artist' | 'band' | 'label'

type ActionResult = {
  message?: string
  ok: boolean
}

export async function registerCreator(input: {
  accountType: AccountType
  country: string
  email: string
  name: string
  password: string
}): Promise<ActionResult> {
  try {
    const payload = await getPayload({ config })
    const country = input.country.trim()
    const email = input.email.trim().toLowerCase()
    const name = input.name.trim()

    if (!country || !email || !name || !input.password) {
      return {
        message: 'Name, country, email, and password are required.',
        ok: false,
      }
    }

    const existingUser = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        email: {
          equals: email,
        },
      },
    })

    if (existingUser.docs.length > 0) {
      return {
        message: 'This user is already registered.',
        ok: false,
      }
    }

    const createdUser = await payload.create({
      collection: 'users',
      data: {
        accountType: input.accountType,
        email,
        name,
        password: input.password,
        role: 'creator',
      },
      draft: false,
      overrideAccess: true,
    })

    const profileId =
      typeof createdUser.profile === 'string' ? createdUser.profile : createdUser.profile?.id

    if (profileId) {
      await payload.update({
        id: profileId,
        collection: 'profiles',
        data: {
          location: country,
        },
        overrideAccess: true,
      })
    }

    return loginCreator({
      email,
      password: input.password,
    })
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Unable to create your account.',
      ok: false,
    }
  }
}

export async function loginCreator(input: {
  email: string
  password: string
}): Promise<ActionResult> {
  try {
    const payload = await getPayload({ config })
    const payloadReq = await createLocalReq({}, payload)

    const result = await payload.login({
      collection: 'users',
      data: {
        email: input.email.trim().toLowerCase(),
        password: input.password,
      },
      req: payloadReq,
    })

    if (!result.token || !result.user) {
      return {
        message: 'Unable to log in.',
        ok: false,
      }
    }

    const cookieStore = await cookies()

    cookieStore.set('payload-token', result.token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return { ok: true }
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Unable to log in.',
      ok: false,
    }
  }
}

export async function logoutCreator(): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set('payload-token', '', {
    expires: new Date(0),
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}
