import type { Payload } from 'payload'

const COMMENT_COOLDOWN_MS = 30_000
const DUPLICATE_COMMENT_WINDOW_MS = 10 * 60_000

function normalizeCommentContent(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export async function validateConsumerCommentSubmission(args: {
  consumerProfileID: string
  content: string
  payload: Payload
  releaseID: string
}) {
  const { consumerProfileID, content, payload, releaseID } = args
  const result = await payload.find({
    collection: 'comments',
    depth: 0,
    limit: 5,
    overrideAccess: true,
    pagination: false,
    sort: '-createdAt',
    where: {
      and: [
        {
          consumerProfile: {
            equals: consumerProfileID,
          },
        },
        {
          release: {
            equals: releaseID,
          },
        },
      ],
    },
  })

  const normalizedContent = normalizeCommentContent(content)
  const now = Date.now()
  const latestComment = result.docs[0]

  if (latestComment?.createdAt) {
    const latestCommentAt = new Date(latestComment.createdAt).getTime()

    if (!Number.isNaN(latestCommentAt) && now - latestCommentAt < COMMENT_COOLDOWN_MS) {
      return {
        message: 'Espera un momento antes de enviar otro comentario sobre este lanzamiento.',
        ok: false as const,
        reason: 'cooldown',
      }
    }
  }

  const hasDuplicate = result.docs.some((comment) => {
    if (!comment?.createdAt || typeof comment.content !== 'string') return false

    const createdAt = new Date(comment.createdAt).getTime()

    if (Number.isNaN(createdAt) || now - createdAt > DUPLICATE_COMMENT_WINDOW_MS) {
      return false
    }

    return normalizeCommentContent(comment.content) === normalizedContent
  })

  if (hasDuplicate) {
    return {
      message: 'Ya enviaste un comentario igual recientemente para este lanzamiento.',
      ok: false as const,
      reason: 'duplicate',
    }
  }

  return {
    ok: true as const,
  }
}
