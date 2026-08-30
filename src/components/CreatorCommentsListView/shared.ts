import type { Comment, ConsumerProfile, Page, Profile } from '@/payload-types'

export const CREATOR_COMMENTS_PAGE_SIZE = 10

type SearchParamsValue = string | string[] | undefined

type SearchParamsLike = Record<string, SearchParamsValue>

type CommentWithReleaseContext = Pick<Comment, 'id'> & {
  post?:
    | (string | null)
    | {
        slug: string
        title: string
      }
  release?:
    | (string | null)
    | {
        id: string
        profile?: (string | null) | Pick<Profile, 'id' | 'slug'>
        slug: string
        title: string
      }
}

function getSingleSearchParamValue(value: SearchParamsValue) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return value || ''
}

export function getCreatorCommentsSearchValue(searchParams?: null | SearchParamsLike) {
  return getSingleSearchParamValue(searchParams?.search).trim()
}

export function getCreatorCommentsPage(searchParams?: null | SearchParamsLike) {
  const parsedPage = Number.parseInt(getSingleSearchParamValue(searchParams?.page), 10)

  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return 1
  }

  return parsedPage
}

export function getCreatorCommentsEmptyMessage(hasSearch: boolean) {
  if (hasSearch) {
    return 'No hay resultados. La búsqueda no generó coincidencias.'
  }

  return 'Aún no tienes comentarios por leer, invita a tus fans a comentar tus lanzamientos.'
}

export function getCreatorCommentsListHref(args: {
  page?: number
  search?: null | string
}) {
  const params = new URLSearchParams()
  const normalizedSearch = args.search?.trim() || ''

  if (normalizedSearch) {
    params.set('search', normalizedSearch)
  }

  if (args.page && args.page > 1) {
    params.set('page', String(args.page))
  }

  const queryString = params.toString()

  return queryString
    ? `/dashboard/collections/comments?${queryString}`
    : '/dashboard/collections/comments'
}

export function getCreatorCommentReleaseHref(comment: CommentWithReleaseContext) {
  const release = comment.release

  if (release && typeof release !== 'string') {
    const releaseSlug = release.slug
    const profile = release.profile
    const profileSlug =
      profile && typeof profile === 'object' && 'slug' in profile ? profile.slug : null

    if (!releaseSlug || !profileSlug) return null

    return `/${profileSlug}/release/${releaseSlug}#comment-${comment.id}`
  }

  const post = comment.post

  if (post && typeof post !== 'string' && post.slug) {
    return `/posts/${post.slug}#comment-${comment.id}`
  }

  return null
}

export function getCreatorCommentAuthorName(consumerProfile?: (string | null) | ConsumerProfile) {
  if (consumerProfile && typeof consumerProfile === 'object' && consumerProfile.displayName) {
    return consumerProfile.displayName
  }

  return 'Fan'
}

export function getCreatorCommentReleaseTitle(comment: {
  post?: (string | null) | Pick<Page, 'title'>
  release?: (string | null) | Pick<Page, 'title'>
}) {
  if (comment.release && typeof comment.release === 'object' && comment.release.title) {
    return comment.release.title
  }

  if (comment.post && typeof comment.post === 'object' && comment.post.title) {
    return comment.post.title
  }

  return 'Contenido sin título'
}

export function getCreatorCommentTargetLabel(comment: Pick<Comment, 'source'>) {
  return comment.source === 'article-public' ? 'Artículo' : 'Lanzamiento'
}

export function getCreatorCommentStatusLabel(status: Comment['status']) {
  switch (status) {
    case 'approved':
      return 'Aprobado'
    case 'pending':
      return 'Pendiente'
    case 'rejected':
      return 'Rechazado'
    default:
      return status
  }
}

export function isCreatorCommentsViewer(user: {
  editorAccess?: boolean | null
  role?: null | string
} | null | undefined) {
  return user?.role === 'admin' || user?.role === 'creator'
}

export function getCreatorCommentArtistProfileSlug(
  artistProfile?: (string | null) | Pick<Profile, 'slug'>,
) {
  if (artistProfile && typeof artistProfile === 'object' && artistProfile.slug) {
    return artistProfile.slug
  }

  return null
}
