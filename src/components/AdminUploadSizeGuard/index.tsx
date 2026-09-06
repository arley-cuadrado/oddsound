'use client'

import { useEffect, useRef, useState } from 'react'

import { exceedsMediaUploadLimit, mediaUploadLimitMessage } from '@/config/uploadLimits'

export default function AdminUploadSizeGuard() {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const showUploadLimitMessage = () => {
      setMessage(mediaUploadLimitMessage)

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setMessage(null), 6000)
    }

    const preventOversizedUpload = (event: Event, files: File[]) => {
      if (!files.some((file) => exceedsMediaUploadLimit(file.size))) return false

      // Stop Payload before it sends a request that a proxy could reject with a generic 413 error.
      event.preventDefault()
      event.stopImmediatePropagation()
      showUploadLimitMessage()
      return true
    }

    const handleFileInputChange = (event: Event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || input.type !== 'file') return

      if (preventOversizedUpload(event, Array.from(input.files || []))) input.value = ''
    }

    const handleDrop = (event: DragEvent) => {
      preventOversizedUpload(event, Array.from(event.dataTransfer?.files || []))
    }

    document.addEventListener('change', handleFileInputChange, true)
    document.addEventListener('drop', handleDrop, true)

    return () => {
      document.removeEventListener('change', handleFileInputChange, true)
      document.removeEventListener('drop', handleDrop, true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!message) return null

  return (
    <div
      role="alert"
      style={{
        background: 'var(--theme-error-100)',
        border: '1px solid var(--theme-error-500)',
        bottom: 24,
        color: 'var(--theme-error-750)',
        maxWidth: 360,
        padding: '16px',
        position: 'fixed',
        right: 24,
        zIndex: 10000,
      }}
    >
      {message}
    </div>
  )
}
