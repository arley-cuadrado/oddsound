import type { Metadata } from 'next'
import config from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { CommentDeleteButton } from '@/components/CommentDeleteButton'
import type { Comment, Profile } from '@/payload-types'
import { SITE_NAME } from '@/seo/site'
import { formatCommentDate } from '@/utilities/formatCommentDate'
import { getMeUser } from '@/utilities/getMeUser'
import { isFanUser } from '@/utilities/isEditorialUser'
import { resolveUserConsumerProfileID } from '@/utilities/userRelations'

export const metadata: Metadata = {
  title: `${SITE_NAME} Fan Account`,
  description: 'Consulta tus comentarios dentro de Oddsound.',
  alternates: {
    canonical: '/fan/account',
  },
  robots: {
    follow: false,
    index: false,
  },
}

type CommentWithRelations = Comment & {
  artistProfile?: null | Pick<Profile, 'displayName' | 'id' | 'slug'>
  post?: null | Pick<any, 'id' | 'slug' | 'title'>
  release?: null | Pick<any, 'id' | 'slug' | 'title'>
  source?: 'article-public' | 'release-public' | null
}

async function getFanComments(consumerProfileID: string) {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'comments',
    depth: 1,
    limit: 20,
    overrideAccess: true,
    pagination: false,
    sort: '-createdAt',
    where: {
      consumerProfile: {
        equals: consumerProfileID,
      },
    },
  })

  return result.docs as CommentWithRelations[]
}

export default async function FanAccountPage() {
  const { user } = await getMeUser({
    nullUserRedirect: '/fan/login',
  })

  if (!isFanUser(user)) {
    redirect('/search')
  }

  const consumerProfileID = resolveUserConsumerProfileID(user)

  if (!consumerProfileID) {
    redirect('/fan/login?auth=profile-missing')
  }

  const comments = await getFanComments(consumerProfileID)

  const payload = await getPayload({ config })
  payload.logger.info(
    {
      commentsCount: comments.length,
      userID: user.id,
    },
    'Fan account loaded.',
  )

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
      <div className="space-y-10">
          <header className="space-y-4 border-b border-border pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/55">
              Fan Account
            </p>
            <h1 className="text-3xl font-medium tracking-tight text-foreground md:text-5xl">
              Hola{user.name ? `, ${user.name}` : ''}.
            </h1>
            <p className="max-w-[44rem] text-[13px] leading-6 text-foreground/75">
              Aquí puedes ver tus comentarios.
            </p>
          </header>

          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-medium text-foreground">Mis comentarios</h2>
              <p className="text-[13px] leading-6 text-foreground/75">
                Historial de comentarios hechos sobre lanzamientos y artículos dentro de Oddsound.
              </p>
            </div>

            {comments.length > 0 ? (
              <div className="space-y-5">
                {comments.map((comment) => {
                  const artistName =
                    comment.artistProfile && typeof comment.artistProfile === 'object'
                      ? comment.artistProfile.displayName
                      : null
                  const releaseTitle =
                    comment.release && typeof comment.release === 'object'
                      ? comment.release.title
                      : null
                  const postTitle =
                    comment.post && typeof comment.post === 'object' ? comment.post.title : null
                  const releaseHref =
                    comment.artistProfile &&
                    typeof comment.artistProfile === 'object' &&
                    comment.artistProfile.slug &&
                    comment.release &&
                    typeof comment.release === 'object' &&
                    comment.release.slug
                      ? `/${comment.artistProfile.slug}/release/${comment.release.slug}#comment-${comment.id}`
                      : null
                  const postHref =
                    comment.post &&
                    typeof comment.post === 'object' &&
                    comment.post.slug
                      ? `/posts/${comment.post.slug}#comment-${comment.id}`
                      : null
                  const targetLabel = postTitle ? 'Artículo' : 'Lanzamiento'
                  const targetTitle = postTitle || releaseTitle
                  const targetHref = postHref || releaseHref

                  return (
                    <article
                      key={comment.id}
                      className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-foreground/60">
                        {artistName ? <span>{artistName}</span> : null}
                        <span>{targetLabel}</span>
                        {targetTitle ? (
                          targetHref ? (
                            <Link className="underline underline-offset-2" href={targetHref}>
                              {targetTitle}
                            </Link>
                          ) : (
                            <span>{targetTitle}</span>
                          )
                        ) : null}
                        <span>
                          {comment.status === 'approved'
                            ? 'Publicado'
                            : 'Pendiente de revisión'}
                        </span>
                        <span>{formatCommentDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-[13px] leading-6 text-foreground/80">
                        {comment.content}
                      </p>
                      <CommentDeleteButton
                        className="text-[12px] text-foreground/65 underline underline-offset-2"
                        commentId={comment.id}
                      />
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px] leading-6 text-foreground/75">
                Aún no has comentado ningún lanzamiento o artículo.
              </p>
            )}
          </section>
      </div>
    </main>
  )
}
