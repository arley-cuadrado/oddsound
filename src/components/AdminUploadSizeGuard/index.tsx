'use client'

import { useEffect } from 'react'

import { exceedsMediaUploadLimit, mediaUploadLimitMessage } from '@/config/uploadLimits'

const uploadButtonLabels = new Set(['Selecciona un archivo', 'Seleccionar archivo'])

function getUploadButton(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null
  const directButton = element?.closest('button')

  if (directButton && uploadButtonLabels.has(directButton.textContent?.trim() || '')) {
    return directButton
  }

  let container = element?.parentElement || null

  while (container) {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      uploadButtonLabels.has(candidate.textContent?.trim() || ''),
    )

    if (button) return button
    container = container.parentElement
  }

  return null
}

function clearUploadLimitMessage(target: EventTarget | null) {
  const button = getUploadButton(target)
  button?.parentElement?.querySelector('[data-upload-limit-notice]')?.remove()
}

function showUploadLimitMessage(target: EventTarget | null) {
  const button = getUploadButton(target)
  if (!button || !button.parentElement) return

  clearUploadLimitMessage(target)

  const notice = document.createElement('span')
  notice.dataset.uploadLimitNotice = 'true'
  notice.role = 'alert'
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
}

export default function AdminUploadSizeGuard() {
  useEffect(() => {
    const preventOversizedUpload = (event: Event, files: File[]) => {
      if (!files.some((file) => exceedsMediaUploadLimit(file.size))) {
        clearUploadLimitMessage(event.target)
        return false
      }

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
      document.removeEventListener('change', handleFileInputChange, true)
      document.removeEventListener('drop', handleDrop, true)
    }
  }, [])

  return null
}
