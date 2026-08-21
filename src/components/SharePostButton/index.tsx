'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  extractTextContent,
  generateShareUrls,
  getSharePostURL,
  type SharePostData,
} from '@/utilities/sharePost'

interface SharePostButtonProps {
  title: string
  slug: string
  content: string
  context?: 'default' | 'posts'
  bannerImageUrl?: string
  authorName?: string
  authorAvatarUrl?: string
  heroImage?: {
    url?: string
  }
}

export default function SharePostButton({
  title,
  slug,
  content,
  context = 'default',
  bannerImageUrl,
  authorName,
  authorAvatarUrl,
  heroImage,
}: SharePostButtonProps) {
  const [copiedState, setCopiedState] = useState<null | string>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  const imageUrl = bannerImageUrl || heroImage?.url || ''
  const description = extractTextContent(content, 3)
  const summaryText = description || extractTextContent(content, 1)

  const shareUrls = useMemo(
    () =>
      generateShareUrls({
        title,
        slug,
        description,
        imageUrl,
        authorName,
        authorAvatar: authorAvatarUrl,
      } satisfies SharePostData),
    [authorAvatarUrl, authorName, description, imageUrl, slug, title],
  )

  useEffect(() => {
    if (!showShareModal) return

    const originalOverflow = document.body.style.overflow

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowShareModal(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showShareModal])

  const shareButtons = [
    {
      id: 'facebook',
      label: 'Facebook',
      url: shareUrls.facebook,
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      url: shareUrls.x,
    },
    {
      id: 'threads',
      label: 'Threads',
      url: shareUrls.threads,
    },
    {
      id: 'instagram',
      label: 'Instagram',
      url: shareUrls.instagram,
      disabled: true,
    },
  ]

  const simpleLinkClassName =
    'inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 transition-opacity hover:opacity-70 dark:text-[#858c98]'

  const handleCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(getSharePostURL(slug))
      setCopiedState(id)

      window.setTimeout(() => {
        setCopiedState((current) => (current === id ? null : current))
      }, 1800)
    } catch {
      setCopiedState(null)
    }
  }

  const handleShare = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400')
  }

  return (
    <>
      <button
        className={simpleLinkClassName}
        onClick={() => setShowShareModal(true)}
        type="button"
      >
        Compartir
      </button>

      {showShareModal ? (
        <div
          className="share-modal-backdrop"
          onClick={() => setShowShareModal(false)}
          role="presentation"
        >
          <div
            aria-labelledby="share-post-title"
            aria-modal="true"
            className={context === 'posts' ? 'share-modal share-modal--posts' : 'share-modal'}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="share-modal__header">
              <div>
                <p className="share-modal__eyebrow">Compartir articulo</p>
                <h2 className="share-modal__title" id="share-post-title">
                  {title}
                </h2>
              </div>

              <button
                className={simpleLinkClassName}
                onClick={() => setShowShareModal(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>

            <div className="share-modal__body">
              {imageUrl ? (
                <img
                  alt={title}
                  className="share-modal__image"
                  src={imageUrl}
                />
              ) : null}

              <p className="share-modal__description">
                {summaryText}
              </p>

              {authorName ? (
                <div className="share-modal__author">
                  {authorAvatarUrl ? (
                    <img
                      alt={authorName}
                      className="share-modal__author-avatar"
                      src={authorAvatarUrl}
                    />
                  ) : null}
                  <span>Por {authorName}</span>
                </div>
              ) : null}
            </div>

            <div className="share-modal__section">
              <p className="share-modal__eyebrow share-modal__section-label">Elige la plataforma</p>

              <div className="share-modal__actions">
                {shareButtons.map((button) => {
                  const isCopied = copiedState === button.id

                  return (
                    <div className="share-modal__action-group" key={button.id}>
                      <button
                        className={simpleLinkClassName}
                        disabled={button.disabled}
                        onClick={() => {
                          if (button.disabled) return
                          handleShare(button.url)
                        }}
                        data-disabled={button.disabled ? 'true' : undefined}
                        type="button"
                      >
                        {button.label}
                      </button>

                      {button.disabled ? (
                        <>
                          <p className="share-modal__note">
                            Instagram no permite compartir articulos directamente. Copia el enlace
                            y usalo en tu story.
                          </p>
                          <button
                            className={simpleLinkClassName}
                            onClick={() => void handleCopy(button.id)}
                            type="button"
                          >
                            {isCopied ? 'Copiado' : 'Copiar enlace'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
