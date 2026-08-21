'use client'

import React from 'react'
import SharePostButton from '@/components/SharePostButton'
import type { Post } from '@/payload-types'

interface PostShareSectionProps {
  post: Post
}

export default function PostShareSection({ post }: PostShareSectionProps) {
  // Extract content text from Lexical structure
  const extractContentFromLexical = (content: any): string => {
    if (!content || typeof content !== 'object') return ''

    if (content.root && Array.isArray(content.root.children)) {
      return content.root.children
        .map((child: any) => {
          if (child.children && Array.isArray(child.children)) {
            return child.children
              .map((textNode: any) => textNode.text || '')
              .join('')
          }
          return child.text || ''
        })
        .filter(Boolean)
        .join('\n')
    }

    return ''
  }

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

  // Get hero image URL
  const getHeroImageUrl = (): string | undefined => {
    const heroImage = post.heroImage
    if (typeof heroImage === 'object' && heroImage !== null && heroImage.url) {
      return heroImage.url
    }
    return undefined
  }

  const contentText = extractContentFromLexical(post.content)
  const authorName = getAuthorName()
  const avatarUrl = getAvatarUrl()
  const heroImageUrl = getHeroImageUrl()

  return (
    <div className="flex justify-center pt-6 pb-2">
      <SharePostButton
        context="posts"
        title={post.title}
        slug={post.slug}
        content={contentText}
        bannerImageUrl={heroImageUrl}
        authorName={authorName}
        authorAvatarUrl={avatarUrl}
      />
    </div>
  )
}
