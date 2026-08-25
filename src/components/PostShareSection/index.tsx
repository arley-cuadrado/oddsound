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
    <div className="flex justify-center border-t border-border pt-8">
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
    </div>
  )
}
