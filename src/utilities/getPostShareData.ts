import type { Post } from '@/payload-types'

import { extractLexicalPlainText } from './extractLexicalPlainText'
import { getMediaResourceURL } from './getMediaUrl'
import { extractTextContent } from './sharePost'

const FALLBACK_ROLE = 'Editor'

export function getPostShareData(post: Post) {
  const profile = typeof post.profile === 'object' && post.profile ? post.profile : null
  const owner = typeof post.owner === 'object' && post.owner ? post.owner : null
  const heroImage =
    post.heroImage && typeof post.heroImage === 'object' ? getMediaResourceURL(post.heroImage) : null
  const authorAvatar =
    profile?.avatar && typeof profile.avatar === 'object' ? getMediaResourceURL(profile.avatar) : null
  const content = extractLexicalPlainText(post.content)
  const summary = extractTextContent(content, 3).replace(/\s+/g, ' ').trim()

  let authorRole = FALLBACK_ROLE

  if (profile?.editorGender === 'female') {
    authorRole = 'Editora'
  }

  return {
    authorAvatarUrl: authorAvatar || undefined,
    authorName: profile?.displayName || owner?.name || undefined,
    authorRole,
    content,
    summary,
    title: post.title,
    urlPath: `/posts/${post.slug}`,
    bannerImageUrl: heroImage || undefined,
  }
}
