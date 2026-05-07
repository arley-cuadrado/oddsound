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
      where: {
        email: {
          equals: normalizedEmail,
        },
      },
    })

    if (existingUser.docs.length > 0) {
      return Response.json({ message: 'This user is already registered.' }, { status: 409 })
    }

    const user = await payload.create({
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
        message: 'Account created successfully.',
        user: {
          email: user.email,
          id: user.id,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create account.'

    return Response.json({ message }, { status: 400 })
  }
}
