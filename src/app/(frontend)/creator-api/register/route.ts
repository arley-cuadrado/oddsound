import { registerCreatorAccount } from '@/utilities/creatorAuth'

type RegisterBody = {
  acceptedLegal?: boolean
  accountType?: 'artist' | 'band' | 'label'
  country?: string
  email?: string
  genre?: string
  name?: string
  password?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as RegisterBody
  const accountType = body.accountType === 'band' ? 'band' : 'artist'

  const result = await registerCreatorAccount({
    acceptedLegal: body.acceptedLegal === true,
    accountType,
    country: body.country || '',
    email: body.email || '',
    genre: body.genre || '',
    name: body.name || '',
    password: body.password || '',
  })

  if (!result.ok) {
    const status = result.message === 'Este usuario ya está registrado.' ? 409 : 400

    return Response.json({ message: result.message }, { status })
  }

  const status = result.message === 'Tu cuenta fue creada. Revisa tu correo para activarla.' ? 201 : 202

  return Response.json(
    {
      message: result.message,
      user: {
        email: result.email,
      },
    },
    { status },
  )
}
