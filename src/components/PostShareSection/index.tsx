'use client'

import React from 'react'
import SharePostButton from '@/components/SharePostButton'
import type { Post } from '@/payload-types'

interface PostShareSectionProps {
  post: Post
}

type LexicalNode = {
  children?: LexicalNode[]
  text?: string
  type?: string
}

function extractContentFromLexical(content: unknown): string {
  if (!content || typeof content !== 'object' || !('root' in content)) return ''

  const root = (content as { root?: LexicalNode }).root
  if (!root) return ''

  const blockTypes = new Set(['heading', 'listitem', 'paragraph', 'quote'])

  const visit = (node: LexicalNode): string => {
    const text = typeof node.text === 'string' ? node.text : ''
    const childrenText = Array.isArray(node.children) ? node.children.map(visit).join('') : ''
    const combined = `${text}${childrenText}`.trim()

    if (!combined) return ''

    return blockTypes.has(node.type || '') ? `${combined}\n` : combined
  }

  return visit(root)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
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
