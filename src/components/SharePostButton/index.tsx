'use client'

import React, { useMemo, useState } from 'react'
import {
  extractTextContent,
  generateShareUrls,
  getSharePostURL,
  type SharePostData,
} from '@/utilities/sharePost'
import { Check, Copy, Facebook, Instagram, MessageCircle, Share2, Twitter, X } from 'lucide-react'

interface SharePostButtonProps {
  title: string
  slug: string
  content: string
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
  bannerImageUrl,
  authorName,
  authorAvatarUrl,
  heroImage,
}: SharePostButtonProps) {
  const [copiedState, setCopiedState] = useState<null | string>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  const imageUrl = bannerImageUrl || heroImage?.url || ''
  const description = extractTextContent(content, 3)

  const shareData: SharePostData = {
    title,
    slug,
    description,
    imageUrl,
    authorName,
    authorAvatar: authorAvatarUrl,
  }

  const shareUrls = useMemo(() => generateShareUrls(shareData), [shareData])

  const shareButtons = [
    {
      id: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      url: shareUrls.facebook,
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      icon: Twitter,
      url: shareUrls.x,
    },
    {
      id: 'threads',
      label: 'Threads',
      icon: MessageCircle,
      url: shareUrls.threads,
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: Instagram,
      url: shareUrls.instagram,
      disabled: true,
    },
  ]

  const simpleLinkClassName =
    'inline-flex items-center gap-2 text-[13px] font-medium text-[#777] underline underline-offset-4 transition-opacity hover:opacity-70 dark:text-[#858c98]'

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
        <Share2 size={16} />
        Compartir
      </button>

      {showShareModal ? (
        <div
          className="share-modal-backdrop"
          onClick={() => setShowShareModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
          }}
        >
          <div
            className="share-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              width: '100%',
              maxWidth: '42rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Compartir articulo</p>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem' }}>{title}</h2>
              </div>

              <button
                onClick={() => setShowShareModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ borderTop: '1px solid #e5e5e5', borderBottom: '1px solid #e5e5e5', padding: '1rem 0' }}>
              {imageUrl ? (
                <img
                  alt={title}
                  src={imageUrl}
                  style={{
                    width: '100%',
                    maxHeight: '220px',
                    objectFit: 'cover',
                    marginBottom: '1rem',
                  }}
                />
              ) : null}

              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {description || 'Comparte este articulo en oddsound.'}
              </p>

              {authorName ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginTop: '1rem',
                    fontSize: '0.85rem',
                    color: '#666',
                  }}
                >
                  {authorAvatarUrl ? (
                    <img
                      alt={authorName}
                      src={authorAvatarUrl}
                      style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                    />
                  ) : null}
                  <span>Por {authorName}</span>
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.85rem' }}>
                Elige la plataforma:
              </p>

              <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
                {shareButtons.map((button) => {
                  const Icon = button.icon
                  const isCopied = copiedState === button.id

                  return (
                    <div key={button.id} className="flex max-w-[16rem] flex-col items-start gap-2">
                      <button
                        disabled={button.disabled}
                        onClick={() => {
                          if (button.disabled) return
                          handleShare(button.url)
                        }}
                        className={simpleLinkClassName}
                        style={{ cursor: button.disabled ? 'default' : 'pointer', opacity: button.disabled ? 0.7 : 1 }}
                        type="button"
                      >
                        <Icon size={20} />
                        <span>{button.label}</span>
                      </button>

                      {button.disabled ? (
                        <>
                          <p className="text-[12px] leading-5 text-[#777] dark:text-[#858c98]">
                            Instagram no permite compartir articulos directamente. Copia el enlace y usalo en tu story.
                          </p>
                          <button
                            className={simpleLinkClassName}
                            onClick={() => void handleCopy(button.id)}
                            type="button"
                          >
                            {isCopied ? <Check size={14} /> : <Copy size={14} />}
                            {isCopied ? 'Copiado' : 'Copiar enlace'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <button
                className={simpleLinkClassName}
                onClick={() => void handleCopy('post-link')}
                type="button"
              >
                {copiedState === 'post-link' ? <Check size={14} /> : <Copy size={14} />}
                {copiedState === 'post-link' ? 'Link copiado' : 'Copiar enlace del articulo'}
              </button>

              <button
                className={simpleLinkClassName}
                onClick={() => setShowShareModal(false)}
                type="button"
              >
                <X size={14} />
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
