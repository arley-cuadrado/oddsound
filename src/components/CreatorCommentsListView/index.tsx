import { DefaultListView } from '@payloadcms/ui'
import Link from 'next/link'
import type { ListViewServerProps } from 'payload'

import type { Comment, ConsumerProfile, Page, Profile } from '@/payload-types'
import { formatCommentDate } from '@/utilities/formatCommentDate'
import { findCreatorProfileByOwner } from '@/utilities/creatorProfiles'

import {
  CREATOR_COMMENTS_PAGE_SIZE,
  getCreatorCommentAuthorName,
  getCreatorCommentReleaseHref,
  getCreatorCommentReleaseTitle,
  getCreatorCommentStatusLabel,
  getCreatorCommentsEmptyMessage,
  getCreatorCommentsListHref,
  getCreatorCommentsPage,
  getCreatorCommentsSearchValue,
  isCreatorCommentsViewer,
} from './shared'

type CreatorUser = {
  editorAccess?: boolean | null
  id?: null | string
  role?: null | string
}

type CreatorComment = Comment & {
  artistProfile?: (string | null) | Pick<Profile, 'id' | 'slug'>
  consumerProfile?: (string | null) | Pick<ConsumerProfile, 'displayName' | 'id'>
  release?: (string | null) | Pick<Page, 'id' | 'profile' | 'slug' | 'title'>
}

function CreatorCommentsEmptyState({ hasSearch }: { hasSearch: boolean }) {
  const message = getCreatorCommentsEmptyMessage(hasSearch)

  return (
    <div className="creator-comments-list__empty">
      <h3>{message.title}</h3>
      <p>{message.description}</p>
    </div>
  )
}

function CreatorCommentsPagination(args: {
  currentPage: number
  search: string
  totalPages: number
}) {
  if (args.totalPages <= 1) return null

  return (
    <nav className="creator-comments-list__pagination" aria-label="Paginación de comentarios">
      <span className="creator-comments-list__pagination-summary">
        Página {args.currentPage} de {args.totalPages}
      </span>

      <div className="creator-comments-list__pagination-links">
        {args.currentPage > 1 ? (
          <Link href={getCreatorCommentsListHref({ page: args.currentPage - 1, search: args.search })}>
            Anterior
          </Link>
        ) : (
          <span aria-disabled="true">Anterior</span>
        )}

        {args.currentPage < args.totalPages ? (
          <Link href={getCreatorCommentsListHref({ page: args.currentPage + 1, search: args.search })}>
            Siguiente
          </Link>
        ) : (
          <span aria-disabled="true">Siguiente</span>
        )}
      </div>
    </nav>
  )
}

export default async function CreatorCommentsListView(props: ListViewServerProps) {
  const creatorUser = props.user as CreatorUser | null

  if (!isCreatorCommentsViewer(creatorUser)) {
    return <DefaultListView {...props} />
  }

  if (!creatorUser?.id) {
    return <DefaultListView {...props} />
  }

  const creatorProfileID = await findCreatorProfileByOwner({
    ownerID: String(creatorUser.id),
    payload: props.payload,
  })

  if (!creatorProfileID) {
    return (
      <section className="creator-comments-list">
        <header className="creator-comments-list__header">
          <h1>Comentarios</h1>
          <p>No encontramos el perfil vinculado a esta cuenta de artista o banda.</p>
        </header>
      </section>
    )
  }

  const search = getCreatorCommentsSearchValue(props.searchParams)
  const currentPage = getCreatorCommentsPage(props.searchParams)

  const result = await props.payload.find({
    collection: 'comments',
    depth: 1,
    limit: CREATOR_COMMENTS_PAGE_SIZE,
    overrideAccess: true,
    page: currentPage,
    sort: '-createdAt',
    where: {
      and: [
        {
          artistProfile: {
            equals: creatorProfileID,
          },
        },
        {
          release: {
            exists: true,
          },
        },
        ...(search
          ? [
              {
                content: {
                  like: search,
                },
              },
            ]
          : []),
      ],
    } as any,
  })

  const comments = result.docs as CreatorComment[]

  return (
    <section className="creator-comments-list">
      <header className="creator-comments-list__header">
        <h1>Comentarios</h1>
        <p>Lee los comentarios que tus fans han dejado en tus lanzamientos y entra al detalle de cada uno.</p>
      </header>

      <form action="/dashboard/collections/comments" className="creator-comments-list__search" method="GET">
        <label className="creator-comments-list__search-label" htmlFor="creator-comments-search">
          Buscar comentarios
        </label>

        <div className="creator-comments-list__search-controls">
          <input
            defaultValue={search}
            id="creator-comments-search"
            name="search"
            placeholder="Buscar por comentario"
            type="search"
          />
          <button type="submit">Buscar</button>
          {search ? <Link href="/dashboard/collections/comments">Limpiar</Link> : null}
        </div>
      </form>

      {comments.length > 0 ? (
        <>
          <div className="creator-comments-list__results">
            {comments.map((comment) => {
              const releaseHref = getCreatorCommentReleaseHref(comment)

              return (
                <article className="creator-comments-list__card" key={comment.id}>
                  <div className="creator-comments-list__card-meta">
                    <span>{getCreatorCommentAuthorName(comment.consumerProfile)}</span>
                    <span>{formatCommentDate(comment.createdAt)}</span>
                    <span>{getCreatorCommentStatusLabel(comment.status)}</span>
                  </div>

                  <h2 className="creator-comments-list__card-title">
                    {getCreatorCommentReleaseTitle(comment)}
                  </h2>

                  <p className="creator-comments-list__card-content">{comment.content}</p>

                  <div className="creator-comments-list__card-links">
                    <Link href={`/dashboard/collections/comments/${comment.id}`}>Abrir comentario</Link>
                    {releaseHref ? <Link href={releaseHref}>Ver en lanzamiento</Link> : null}
                  </div>
                </article>
              )
            })}
          </div>

          <CreatorCommentsPagination
            currentPage={result.page || currentPage}
            search={search}
            totalPages={result.totalPages || 1}
          />
        </>
      ) : (
        <CreatorCommentsEmptyState hasSearch={Boolean(search)} />
      )}
    </section>
  )
}
