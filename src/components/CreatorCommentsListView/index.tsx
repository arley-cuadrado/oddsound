import { DefaultListView, SearchIcon } from '@payloadcms/ui'
import Link from 'next/link'
import type { ListViewServerProps } from 'payload'

import type { Comment, ConsumerProfile, Page, Profile } from '@/payload-types'
import { formatCommentDate } from '@/utilities/formatCommentDate'
import { findCreatorProfileByOwner } from '@/utilities/creatorProfiles'
import { resolveUserProfileID } from '@/utilities/userRelations'

import {
  CREATOR_COMMENTS_PAGE_SIZE,
  getCreatorCommentAuthorName,
  getCreatorCommentsDescription,
  getCreatorCommentReleaseHref,
  getCreatorCommentReleaseTitle,
  getCreatorCommentStatusLabel,
  getCreatorCommentTargetLabel,
  getCreatorCommentsEmptyMessage,
  getCreatorCommentsListHref,
  getCreatorCommentsPage,
  getCreatorCommentsSearchValue,
  getCreatorCommentsViewerKind,
  isCreatorCommentsViewer,
} from './shared'
import { deleteDashboardComment } from './actions'

type CreatorUser = {
  editorAccess?: boolean | null
  id?: null | string
  profile?: null | string | { id?: null | string }
  role?: null | string
}

type CreatorComment = Comment & {
  artistProfile?: (string | null) | Pick<Profile, 'id' | 'slug'>
  consumerProfile?: (string | null) | Pick<ConsumerProfile, 'displayName' | 'id'>
  post?: (string | null) | Pick<Page, 'slug' | 'title'>
  release?: (string | null) | Pick<Page, 'id' | 'profile' | 'slug' | 'title'>
}

function CreatorCommentsEmptyState(args: {
  hasSearch: boolean
  viewerKind: 'admin' | 'editorial' | 'musical'
}) {
  const message = getCreatorCommentsEmptyMessage(args)

  return (
    <div className="creator-comments-list__empty no-results">
      <p>{message}</p>
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
          <Link
            className="btn btn--style-secondary btn--size-medium btn--withoutPopup btn--no-margin"
            href={getCreatorCommentsListHref({ page: args.currentPage - 1, search: args.search })}
          >
            <span className="btn__content">
              <span className="btn__label">Anterior</span>
            </span>
          </Link>
        ) : (
          <span aria-disabled="true">Anterior</span>
        )}

        {args.currentPage < args.totalPages ? (
          <Link
            className="btn btn--style-secondary btn--size-medium btn--withoutPopup btn--no-margin"
            href={getCreatorCommentsListHref({ page: args.currentPage + 1, search: args.search })}
          >
            <span className="btn__content">
              <span className="btn__label">Siguiente</span>
            </span>
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
  const isAdminViewer = creatorUser?.role === 'admin'
  const viewerKind = getCreatorCommentsViewerKind(creatorUser)

  if (!isCreatorCommentsViewer(creatorUser)) {
    return <DefaultListView {...props} />
  }

  if (!creatorUser?.id) {
    return <DefaultListView {...props} />
  }

  const creatorProfileID = isAdminViewer
    ? null
    : resolveUserProfileID(creatorUser) ||
      (await findCreatorProfileByOwner({
        ownerID: String(creatorUser.id),
        payload: props.payload,
      }))

  if (!isAdminViewer && !creatorProfileID) {
    return (
      <section className="creator-comments-list">
        <header className="creator-comments-list__header">
          <h1>Comentarios</h1>
          <p>
            No encontramos el perfil vinculado a esta cuenta
            {viewerKind === 'editorial' ? ' editorial.' : ' de artista o banda.'}
          </p>
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
        ...(creatorProfileID
          ? [
              {
                artistProfile: {
                  equals: creatorProfileID,
                },
              },
            ]
          : []),
        viewerKind === 'admin'
          ? {
              or: [
                {
                  release: {
                    exists: true,
                  },
                },
                {
                  post: {
                    exists: true,
                  },
                },
              ],
            }
          : viewerKind === 'editorial'
            ? {
                post: {
                  exists: true,
                },
              }
            : {
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
        <p>{getCreatorCommentsDescription(viewerKind)}</p>
      </header>

      <form action="/dashboard/collections/comments" className="creator-comments-list__search" method="GET">
        <div className="creator-comments-list__search-controls">
          <div className="search-bar">
            <SearchIcon />
            <div className="search-filter">
              <input
                aria-label="Buscar por comentario"
                className="search-filter__input"
                defaultValue={search}
                id="creator-comments-search"
                name="search"
                placeholder="Buscar por comentario"
                type="search"
              />
            </div>
          </div>

          <div className="creator-comments-list__search-actions">
            <button
              className="btn btn--style-primary btn--size-medium btn--withoutPopup btn--no-margin"
              type="submit"
            >
              <span className="btn__content">
                <span className="btn__label">Buscar</span>
              </span>
            </button>

            {search ? (
              <Link
                className="btn btn--style-secondary btn--size-medium btn--withoutPopup btn--no-margin"
                href="/dashboard/collections/comments"
              >
                <span className="btn__content">
                  <span className="btn__label">Limpiar</span>
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      {comments.length > 0 ? (
        <>
          <div className="creator-comments-list__results">
            {comments.map((comment) => {
              const releaseHref = getCreatorCommentReleaseHref(comment)
              const returnTo = getCreatorCommentsListHref({ page: result.page || currentPage, search })

              return (
                <article className="creator-comments-list__card" key={comment.id}>
                  <div className="creator-comments-list__card-meta">
                    <span>{getCreatorCommentTargetLabel(comment)}</span>
                    <span>{getCreatorCommentAuthorName(comment.consumerProfile)}</span>
                    <span>{formatCommentDate(comment.createdAt)}</span>
                    <span>{getCreatorCommentStatusLabel(comment.status)}</span>
                  </div>

                  <h2 className="creator-comments-list__card-title">
                    {getCreatorCommentReleaseTitle(comment)}
                  </h2>

                  <p className="creator-comments-list__card-content">{comment.content}</p>

                  <div className="creator-comments-list__card-links">
                    <Link
                      className="btn btn--style-icon-label btn--size-medium btn--withoutPopup btn--no-margin"
                      href={`/dashboard/collections/comments/${comment.id}`}
                    >
                      <span className="btn__content">
                        <span className="btn__label">Abrir comentario</span>
                      </span>
                    </Link>
                    {releaseHref ? (
                      <Link
                        className="btn btn--style-icon-label btn--size-medium btn--withoutPopup btn--no-margin"
                        href={releaseHref}
                      >
                        <span className="btn__content">
                          <span className="btn__label">Ver en lanzamiento</span>
                        </span>
                      </Link>
                    ) : null}
                    <form action={deleteDashboardComment}>
                      <input name="commentId" type="hidden" value={comment.id} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <button
                        className="btn btn--style-secondary btn--size-medium btn--withoutPopup btn--no-margin"
                        type="submit"
                      >
                        <span className="btn__content">
                          <span className="btn__label">Eliminar</span>
                        </span>
                      </button>
                    </form>
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
          <CreatorCommentsEmptyState hasSearch={Boolean(search)} viewerKind={viewerKind} />
        )}
    </section>
  )
}
