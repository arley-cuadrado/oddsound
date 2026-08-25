import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'
import { headers } from 'next/headers'

import { validateConsumerCommentSubmission } from '@/utilities/consumerCommentGuards'
import { isFanUser } from '@/utilities/isEditorialUser'
import { resolveUserConsumerProfileID } from '@/utilities/userRelations'

export async function POST(request: Request) {
  const startedAt = Date.now()
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user || !isFanUser(user)) {
    payload.logger.warn('Fan comment rejected: unauthenticated or invalid user type.')
    return Response.json({ message: 'Debes iniciar sesión como fan para comentar.' }, { status: 401 })
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

  const consumerProfileID = resolveUserConsumerProfileID(user)
  const commentStatus = user.authProvider === 'google' ? 'approved' : 'pending'

  if (!consumerProfileID) {
    payload.logger.warn({ userID: user.id }, 'Fan comment rejected: missing consumer profile.')
    return Response.json({ message: 'Tu cuenta de fan aún no está lista.' }, { status: 400 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    payload.logger.warn({ userID: user.id }, 'Fan comment rejected: invalid JSON payload.')
    return Response.json({ message: 'No fue posible leer el comentario.' }, { status: 400 })
  }

  const content =
    body && typeof body === 'object' && 'content' in body && typeof body.content === 'string'
      ? body.content.trim()
      : ''
  const releaseID =
    body && typeof body === 'object' && 'release' in body && typeof body.release === 'string'
      ? body.release
      : ''
  const postID =
    body && typeof body === 'object' && 'post' in body && typeof body.post === 'string'
      ? body.post
      : ''
  const artistProfileID =
    body && typeof body === 'object' && 'artistProfile' in body && typeof body.artistProfile === 'string'
      ? body.artistProfile
      : ''

  const hasSingleTarget = Boolean(releaseID) !== Boolean(postID)

  if (!content || !artistProfileID || !hasSingleTarget) {
    payload.logger.warn(
      { artistProfileID, postID, releaseID, userID: user.id },
      'Fan comment rejected: missing required fields.',
    )
    return Response.json({ message: 'Faltan datos para crear el comentario.' }, { status: 400 })
  }

  const targetType = releaseID ? 'release' : 'post'
  const targetId = releaseID || postID
  const targetLabel = targetType === 'release' ? 'lanzamiento' : 'artículo'

  if (targetType === 'release') {
    const release = await payload
      .findByID({
        collection: 'pages',
        id: releaseID,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)

    if (!release || release._status !== 'published') {
      payload.logger.warn({ releaseID, userID: user.id }, 'Fan comment rejected: release not available.')
      return Response.json(
        { message: 'Este lanzamiento no está disponible para comentarios.' },
        { status: 400 },
      )
    }
  } else {
    const post = await payload
      .findByID({
        collection: 'posts',
        id: postID,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)

    if (!post || post._status !== 'published') {
      payload.logger.warn({ postID, userID: user.id }, 'Fan comment rejected: post not available.')
      return Response.json(
        { message: 'Este artículo no está disponible para comentarios.' },
        { status: 400 },
      )
    }
  }

  const artistProfile = await payload
    .findByID({
      collection: 'profiles',
      id: artistProfileID,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)

  if (!artistProfile) {
    payload.logger.warn(
      { artistProfileID, postID, releaseID, userID: user.id },
      'Fan comment rejected: artist profile not found.',
    )
    return Response.json({ message: 'No fue posible resolver el artista del comentario.' }, { status: 400 })
  }

  const commentGuard = await validateConsumerCommentSubmission({
    consumerProfileID,
    content,
    payload,
    targetId,
    targetType,
  })

  if (!commentGuard.ok) {
    payload.logger.warn(
      { consumerProfileID, postID, reason: commentGuard.reason, releaseID, userID: user.id },
      'Fan comment rejected by guard.',
    )
    return Response.json({ message: commentGuard.message }, { status: 429 })
  }

  const comment = await payload.create({
    collection: 'comments',
    data: {
      artistProfile: artistProfileID,
      authorUser: String(user.id),
      consumerProfile: consumerProfileID,
      content,
      post: postID || undefined,
      release: releaseID || undefined,
      source: targetType === 'release' ? 'release-public' : 'article-public',
      status: commentStatus,
    } as any,
    depth: 0,
    overrideAccess: false,
    req: payloadReq,
  })

  await payload.update({
    collection: 'consumerProfiles',
    id: consumerProfileID,
    data: {
      lastCommentAt: new Date().toISOString(),
    },
    depth: 0,
    req: payloadReq,
    overrideAccess: true,
  })

  payload.logger.info(
    {
      commentID: comment.id,
      durationMs: Date.now() - startedAt,
      postID,
      releaseID,
      targetType,
      userID: user.id,
    },
    'Fan comment created.',
  )

  return Response.json({
    comment: {
      content: comment.content,
      createdAt: comment.createdAt,
      id: comment.id,
      status: comment.status,
    },
    ok: true,
  })
}
