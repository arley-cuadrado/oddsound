import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { CommentDeleteButton } from '@/components/CommentDeleteButton'
import { ConsumerCommentForm } from '@/components/ConsumerCommentForm'
import { formatCommentDate } from '@/utilities/formatCommentDate'
import { isFanUser } from '@/utilities/isEditorialUser'
import { resolveUserConsumerProfileID } from '@/utilities/userRelations'

type Props = {
  artistProfileId: string
  shareControl?: ReactNode
  targetId: string
  targetType: 'post' | 'release'
}

type CommentWithAuthor = {
  authorUser?: null | {
    id?: null | string
    name?: null | string
  }
  content: string
  createdAt: string
  id: string
  status?: 'approved' | 'pending' | 'rejected' | null
}

async function getAuthenticatedUser() {
  const payload = await getPayload({ config: configPromise })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  return user
}

async function getVisibleComments(args: {
  consumerProfileId?: null | string
  targetId: string
  targetType: 'post' | 'release'
}) {
  const payload = await getPayload({ config: configPromise })
  const targetFilter = {
    [args.targetType]: {
      equals: args.targetId,
    },
  }
  const where =
    args.consumerProfileId
      ? {
          and: [
            targetFilter,
            {
              or: [
                {
                  status: {
                    equals: 'approved',
                  },
                },
                {
                  and: [
                    {
                      consumerProfile: {
                        equals: args.consumerProfileId,
                      },
                    },
                    {
                      status: {
                        equals: 'pending',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }
      : {
          and: [
            targetFilter,
            {
              status: {
                equals: 'approved',
              },
            },
          ],
        }

  const result = await payload.find({
    collection: 'comments',
    depth: 1,
    limit: 20,
    overrideAccess: true,
    pagination: false,
    sort: '-createdAt',
    where: where as any,
  })

  return result.docs as CommentWithAuthor[]
}

export async function ConsumerCommentsSection({
  artistProfileId,
  shareControl,
  targetId,
  targetType,
}: Props) {
  const user = await getAuthenticatedUser().catch(() => null)
  const consumerProfileId = resolveUserConsumerProfileID(user)
  const isFan = isFanUser(user)
  const comments = await getVisibleComments({
    consumerProfileId: isFan ? consumerProfileId : null,
    targetId,
    targetType,
  })
  const currentUserId = user?.id ? String(user.id) : null
  const resourceLabel = targetType === 'post' ? 'artículo' : 'lanzamiento'

  return (
    <section className="px-4 pb-16 pt-10 md:px-0">
      <div className="space-y-8 border-t border-border pt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-foreground">Comentarios</h2>
          {shareControl}
        </div>

        {isFan ? (
          <ConsumerCommentForm
            artistProfileId={artistProfileId}
            targetId={targetId}
            targetType={targetType}
          />
        ) : (
          <p className="text-[13px] leading-6 text-foreground/75">
            <Link className="underline underline-offset-2 title" href="/fan/login">
              Inicia sesión como fan
            </Link>{' '}
            {`para comentar este ${resourceLabel}.`}
          </p>
        )}

        <div className="space-y-6">
          {comments.length > 0 ? (
            comments.map((comment) => {
              const authorName =
                comment.authorUser &&
                typeof comment.authorUser === 'object' &&
                comment.authorUser.name
                  ? comment.authorUser.name
                  : 'Fan'

              return (
                <article
                  id={`comment-${comment.id}`}
                  key={comment.id}
                  className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-foreground/60">
                    <span>{authorName}</span>
                    <span>{formatCommentDate(comment.createdAt)}</span>
                    {comment.status === 'pending' ? <span>Pendiente de revisión</span> : null}
                    {currentUserId &&
                    comment.authorUser &&
                    typeof comment.authorUser === 'object' &&
                    String(comment.authorUser.id) === currentUserId ? (
                      <CommentDeleteButton
                        className="text-[12px] text-foreground/65 underline underline-offset-2"
                        commentId={comment.id}
                      />
                    ) : null}
                  </div>
                  <p className="text-[13px] leading-6 text-foreground/80">{comment.content}</p>
                </article>
              )
            })
          ) : (
            <p className="text-[13px] leading-6 text-foreground/75">
              {`Aún no hay comentarios publicados para este ${resourceLabel}.`}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
