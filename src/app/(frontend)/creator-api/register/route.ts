import config from '@payload-config'
import { getPayload } from 'payload'

type RegisterBody = {
  accountType?: 'artist' | 'band' | 'label'
  email?: string
  name?: string
  password?: string
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const body = (await request.json()) as RegisterBody

    if (!body.email || !body.password || !body.name) {
      return Response.json({ message: 'Name, email, and password are required.' }, { status: 400 })
    }

    const normalizedEmail = body.email.trim().toLowerCase()

    const existingUser = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      showHiddenFields: true,
      where: {
        email: {
          equals: normalizedEmail,
        },
      },
    })

    const user = existingUser.docs[0] as
      | {
          _verified?: boolean | null
          email: string
        }
      | undefined

    if (user?._verified) {
      return Response.json({ message: 'This user is already registered.' }, { status: 409 })
    }

    if (user) {
      return Response.json(
        {
          message: 'Account already exists and is pending verification.',
          user: {
            email: user.email,
          },
        },
        { status: 202 },
      )
    }

    const createdUser = await payload.create({
      collection: 'users',
      data: {
        accountType: body.accountType || 'artist',
        email: normalizedEmail,
        name: body.name.trim(),
        password: body.password,
        role: 'creator',
      },
      draft: false,
      overrideAccess: true,
    })

    return Response.json(
      {
        message: 'Account created successfully. Check your email to verify it.',
        user: {
          email: createdUser.email,
          id: createdUser.id,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create account.'

    return Response.json({ message }, { status: 400 })
  }
}
