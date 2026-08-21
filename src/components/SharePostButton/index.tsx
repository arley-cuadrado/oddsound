'use client'

import React, { useState, useMemo } from 'react'
import { generateShareUrls, extractTextContent, type SharePostData } from '@/utilities/sharePost'
import {
  Facebook,
  Twitter,
  Share2,
  MessageCircle,
  Music2,
} from 'lucide-react'

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
      color: '#1877F2',
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      icon: Twitter,
      url: shareUrls.x,
      color: '#000000',
    },
    {
      id: 'threads',
      label: 'Threads',
      icon: MessageCircle,
      url: shareUrls.threads,
      color: '#000000',
    },
    {
      id: 'tiktok',
      label: 'TikTok',
      icon: Music2,
      url: 'https://www.tiktok.com/',
      color: '#25F4EE',
      disabled: true,
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: Share2,
      url: 'https://www.instagram.com/',
      color: '#E1306C',
      disabled: true,
    },
  ]

  const handleShare = (url: string) => {
    if (url === 'https://www.tiktok.com/' || url === 'https://www.instagram.com/') {
      alert('Por favor, comparte este artículo manualmente en ' + (url.includes('tiktok') ? 'TikTok' : 'Instagram'))
      return
    }

    window.open(url, '_blank', 'width=600,height=400')
  }

  return (
    <>
      <button
        onClick={() => setShowShareModal(true)}
        className="share-post-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0056b3'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#007bff'
        }}
      >
        <Share2 size={16} />
        Compartir
      </button>

      {showShareModal && (
        <div
          className="share-modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="share-modal"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Compartir Artículo</h2>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '0.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {description.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < description.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>

              {imageUrl && (
                <div style={{ marginTop: '1rem' }}>
                  <img
                    src={imageUrl}
                    alt={title}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '0.375rem',
                      maxHeight: '200px',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              )}

              {authorName && (
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                  {authorAvatarUrl && (
                    <img
                      src={authorAvatarUrl}
                      alt={authorName}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <span>Por {authorName}</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#666' }}>Comparte en tus redes sociales:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
                {shareButtons.map((button) => {
                  const Icon = button.icon
                  return (
                    <button
                      key={button.id}
                      onClick={() => handleShare(button.url)}
                      disabled={button.disabled}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '1rem',
                        backgroundColor: button.disabled ? '#e0e0e0' : 'white',
                        border: `2px solid ${button.disabled ? '#ddd' : button.color}`,
                        borderRadius: '0.5rem',
                        cursor: button.disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: button.disabled ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!button.disabled) {
                          e.currentTarget.style.backgroundColor = button.color
                          e.currentTarget.style.color = 'white'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white'
                        e.currentTarget.style.color = 'inherit'
                      }}
                    >
                      <Icon size={20} style={{ color: button.disabled ? '#999' : button.color }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{button.label}</span>
                      {button.disabled && <span style={{ fontSize: '0.65rem', color: '#999' }}>Pronto</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
