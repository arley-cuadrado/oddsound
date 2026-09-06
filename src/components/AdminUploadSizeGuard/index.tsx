'use client'

import { useEffect, useRef, useState } from 'react'

import { exceedsMediaUploadLimit, mediaUploadLimitMessage } from '@/config/uploadLimits'

type UploadLimitAlert = {
  left: number
  message: string
  top: number
}

const uploadButtonLabels = new Set(['Selecciona un archivo', 'Seleccionar archivo'])

function addUploadLimitNotices() {
  document.querySelectorAll('button').forEach((button) => {
    if (!uploadButtonLabels.has(button.textContent?.trim() || '')) return

    const container = button.parentElement
    if (!container || container.querySelector('[data-upload-limit-notice]')) return

    const notice = document.createElement('span')
    notice.dataset.uploadLimitNotice = 'true'
    notice.textContent = mediaUploadLimitMessage
    Object.assign(notice.style, {
      color: 'var(--theme-error-750)',
      display: 'inline-block',
      fontSize: '0.8125rem',
      lineHeight: '1.35',
      marginLeft: '12px',
      maxWidth: '360px',
      verticalAlign: 'middle',
    })

    button.insertAdjacentElement('afterend', notice)
  })
}

function getAlertPosition(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null
  const anchor = element?.parentElement || element
  const bounds = anchor?.getBoundingClientRect()
  const alertWidth = 360

  if (!bounds || bounds.width === 0) return { left: 24, top: 24 }

  return {
    left: Math.max(16, Math.min(bounds.right + 12, window.innerWidth - alertWidth - 16)),
    top: Math.max(16, Math.min(bounds.top, window.innerHeight - 100)),
  }
}

export default function AdminUploadSizeGuard() {
  const [alert, setAlert] = useState<UploadLimitAlert | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    addUploadLimitNotices()

    const observer = new MutationObserver(addUploadLimitNotices)
    observer.observe(document.body, { childList: true, subtree: true })

    const showUploadLimitMessage = (target: EventTarget | null) => {
      setAlert({ message: mediaUploadLimitMessage, ...getAlertPosition(target) })

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setAlert(null), 6000)
    }

    const preventOversizedUpload = (event: Event, files: File[]) => {
      if (!files.some((file) => exceedsMediaUploadLimit(file.size))) return false

      // Stop Payload before it sends a request that a proxy could reject with a generic 413 error.
      event.preventDefault()
      event.stopImmediatePropagation()
      showUploadLimitMessage(event.target)
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
      observer.disconnect()
      document.querySelectorAll('[data-upload-limit-notice]').forEach((notice) => notice.remove())
      document.removeEventListener('change', handleFileInputChange, true)
      document.removeEventListener('drop', handleDrop, true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!alert) return null

  return (
    <div
      role="alert"
      style={{
        background: 'var(--theme-error-100)',
        border: '1px solid var(--theme-error-500)',
        left: alert.left,
        color: 'var(--theme-error-750)',
        maxWidth: 360,
        padding: '16px',
        position: 'fixed',
        top: alert.top,
        zIndex: 10000,
      }}
    >
      {alert.message}
    </div>
  )
}
