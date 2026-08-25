'use client'

import React from 'react'
import SharePostButton from '@/components/SharePostButton'
import type { Post } from '@/payload-types'
import { extractLexicalPlainText } from '@/utilities/extractLexicalPlainText'

interface PostShareSectionProps {
  post: Post
}

export default function PostShareSection({ post }: PostShareSectionProps) {
  // Get profile avatar URL
  const getAvatarUrl = (): string | undefined => {
    const profile = post.profile
    if (typeof profile === 'object' && profile !== null && profile.avatar) {
      const avatar = profile.avatar
      if (typeof avatar === 'object' && avatar !== null && avatar.url) {
        return avatar.url
      }
    }
    return undefined
  }

  // Get author name
  const getAuthorName = (): string | undefined => {
    const profile = post.profile
    if (typeof profile === 'object' && profile !== null && profile.displayName) {
      return profile.displayName
    }

    const owner = post.owner
    if (typeof owner === 'object' && owner !== null && owner.name) {
      return owner.name
    }

    return undefined
  }

  const getAuthorRole = (): string => {
    const profile = post.profile

    if (typeof profile === 'object' && profile !== null && 'editorGender' in profile) {
      if (profile.editorGender === 'female') return 'Editora'
      if (profile.editorGender === 'male') return 'Editor'
    }

    return 'Editor'
  }

  // Get hero image URL
  const getHeroImageUrl = (): string | undefined => {
    const heroImage = post.heroImage
    if (typeof heroImage === 'object' && heroImage !== null && heroImage.url) {
      return heroImage.url
    }
    return undefined
  }

  const contentText = extractLexicalPlainText(post.content)
  const authorName = getAuthorName()
  const avatarUrl = getAvatarUrl()
  const authorRole = getAuthorRole()
  const heroImageUrl = getHeroImageUrl()

  return (
    <div className="flex justify-center border-t border-border pt-8">
      <SharePostButton
        context="posts"
        title={post.title}
        slug={post.slug}
        content={contentText}
        urlPath={`/posts/${post.slug}`}
        bannerImageUrl={heroImageUrl}
        authorName={authorName}
        authorAvatarUrl={avatarUrl}
        authorRole={authorRole}
      />
    </div>
  )
}
