import React from 'react'

import type { VideoBlock as VideoBlockProps } from '@/payload-types'
import { cn } from '@/utilities/ui'

type Props = VideoBlockProps & {
  disableInnerContainer?: boolean
}

function getYouTubeEmbedURL(video: string) {
  try {
    const parsedURL = new URL(video)
    const hostname = parsedURL.hostname.replace(/^www\./, '')

    if (hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${parsedURL.pathname}`
    }

    if (
      (hostname === 'youtube.com' || hostname === 'm.youtube.com') &&
      parsedURL.searchParams.get('v')
    ) {
      return `https://www.youtube.com/embed/${parsedURL.searchParams.get('v')}`
    }

    if (
      (hostname === 'youtube.com' || hostname === 'm.youtube.com') &&
      parsedURL.pathname.includes('/shorts/')
    ) {
      const id = parsedURL.pathname.split('/shorts/')[1]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    return null
  } catch {
    return null
  }
}

export const VideoBlock: React.FC<Props> = ({ disableInnerContainer, video }) => {
  const embedURL = getYouTubeEmbedURL(video)

  if (!embedURL) {
    return (
      <p className={cn('text-sm text-slate-500', { container: !disableInnerContainer })}>
        Invalid video URL
      </p>
    )
  }

  return (
    <section className={cn('w-auto pt-16 pb-16', { container: !disableInnerContainer })}>
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="aspect-video w-full"
        src={embedURL}
        title="YouTube video player"
      />
    </section>
  )
}
