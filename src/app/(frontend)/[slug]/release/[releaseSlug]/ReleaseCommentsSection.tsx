import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { headers } from 'next/headers'
import Link from 'next/link'

import type { Comment as CommentDoc, User } from '@/payload-types'
import { isFanUser } from '@/utilities/isEditorialUser'
import { resolveUserConsumerProfileID } from '@/utilities/userRelations'
import { ReleaseCommentsForm } from './ReleaseCommentsForm'

type Props = {
  artistProfileId: string
  releaseId: string
}

type CommentWithAuthor = CommentDoc & {
  authorUser?: null | Pick<User, 'id' | 'name'>
}

async function getAuthenticatedUser() {
  const payload = await getPayload({ config: configPromise })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  return user
}

async function getVisibleComments(args: {
  consumerProfileId?: null | string
  releaseId: string
}) {
  const payload = await getPayload({ config: configPromise })
  const where =
    args.consumerProfileId
      ? {
          and: [
            {
              release: {
                equals: args.releaseId,
              },
            },
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
            {
              release: {
                equals: args.releaseId,
              },
            },
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

export async function ReleaseCommentsSection({ artistProfileId, releaseId }: Props) {
  const user = await getAuthenticatedUser().catch(() => null)
  const consumerProfileId = resolveUserConsumerProfileID(user)
  const isFan = isFanUser(user)
  const comments = isFan
    ? await getVisibleComments({
        consumerProfileId,
        releaseId,
      })
    : []

  return (
    <section className="px-4 pb-16 pt-10 md:px-0">
      <div className="space-y-8 border-t border-border pt-8">
        <h2 className="text-lg font-medium text-foreground">Comentarios</h2>

        {isFan ? (
          <>
            <p className="text-[13px] leading-6 text-foreground/75">
              Comparte lo que te dejó este lanzamiento y ayuda a mantener cerca al artista de las
              reacciones de su audiencia.
            </p>

            <ReleaseCommentsForm artistProfileId={artistProfileId} releaseId={releaseId} />
          </>
        ) : (
          <p className="text-[13px] leading-6 text-foreground/75">
            <Link className="underline underline-offset-2 title" href="/fan/login">
              Inicia sesión como fan
            </Link>{' '}
            para comentar este lanzamiento.
          </p>
        )}

        {isFan ? (
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
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-foreground/60">
                      <span>{authorName}</span>
                      {comment.status === 'pending' ? <span>Pendiente de revisión</span> : null}
                    </div>
                    <p className="text-[13px] leading-6 text-foreground/80">{comment.content}</p>
                  </article>
                )
              })
            ) : (
              <p className="text-[13px] leading-6 text-foreground/75">
                Aún no hay comentarios publicados para este lanzamiento.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
