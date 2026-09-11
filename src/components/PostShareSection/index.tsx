'use client'

import React from 'react'
import SharePostButton from '@/components/SharePostButton'
import type { Post } from '@/payload-types'
import { getPostShareData } from '@/utilities/getPostShareData'

interface PostShareSectionProps {
  post: Post
}

export default function PostShareSection({ post }: PostShareSectionProps) {
  const shareData = getPostShareData(post)

  return (
    <SharePostButton
      context="posts"
      title={shareData.title}
      slug={post.slug}
      content={shareData.content}
      urlPath={shareData.urlPath}
      bannerImageUrl={shareData.bannerImageUrl}
      authorName={shareData.authorName}
      authorAvatarUrl={shareData.authorAvatarUrl}
      authorRole={shareData.authorRole}
    />
  )
}
