import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'
import { headers } from 'next/headers'

import { isFanUser } from '@/utilities/isEditorialUser'
import { resolveUserConsumerProfileID } from '@/utilities/userRelations'

type RouteContext = {
  params: Promise<{
    commentId: string
  }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user || !isFanUser(user)) {
    return Response.json({ message: 'Debes iniciar sesión como fan.' }, { status: 401 })
  }

  const consumerProfileID = resolveUserConsumerProfileID(user)

  if (!consumerProfileID) {
    return Response.json({ message: 'Tu cuenta de fan aún no está lista.' }, { status: 400 })
  }

  const { commentId } = await context.params

  const comment = await payload
    .findByID({
      collection: 'comments',
      id: commentId,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)

  if (!comment) {
    return Response.json({ message: 'No encontramos ese comentario.' }, { status: 404 })
  }

  const ownsComment =
    String(comment.authorUser) === String(user.id) || String(comment.consumerProfile) === consumerProfileID

  if (!ownsComment) {
    return Response.json({ message: 'No puedes eliminar este comentario.' }, { status: 403 })
  }

  const payloadReq = await createLocalReq(
    {
      req: {
        headers: requestHeaders,
      } as any,
      user: user as any,
    },
    payload,
  )

  await payload.delete({
    collection: 'comments',
    id: commentId,
    overrideAccess: true,
    req: payloadReq,
  })

  return Response.json({ ok: true })
}
