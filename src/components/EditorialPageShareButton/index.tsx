'use client'

import { useState } from 'react'
import { getShareURL } from '@/utilities/sharePost'

export default function EditorialPageShareButton({
  title,
  urlPath,
}: {
  title: string
  urlPath: string
}) {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    const shareUrl = getShareURL(urlPath)

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        })
        return
      } catch {
        // Fall through to clipboard when the user dismisses or the API is unavailable.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      className="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 transition-opacity hover:opacity-70 dark:text-[#858c98]"
      onClick={() => void handleClick()}
      type="button"
    >
      {copied ? 'Enlace copiado' : 'Compartir'}
    </button>
  )
}
