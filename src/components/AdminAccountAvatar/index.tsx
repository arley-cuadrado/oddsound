'use client'

import { useAuth } from '@payloadcms/ui'

type AccountAvatar = {
  thumbnailURL?: null | string
  url?: null | string
}

function getAvatarURL(avatar: unknown) {
  if (!avatar || typeof avatar !== 'object') return null

  const resource = avatar as AccountAvatar
  return resource.thumbnailURL || resource.url || null
}

export default function AdminAccountAvatar() {
  const { user } = useAuth<any>()
  const avatarURL = getAvatarURL(user?.accountAvatar)
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'O'

  if (avatarURL) {
    return (
      <img
        alt="Avatar de cuenta"
        className="gravatar-account"
        height={25}
        src={avatarURL}
        style={{ borderRadius: '50%', objectFit: 'cover' }}
        width={25}
      />
    )
  }

  return (
    <span
      aria-label="Avatar de cuenta"
      className="gravatar-account"
      style={{
        alignItems: 'center',
        background: 'var(--theme-elevation-300)',
        borderRadius: '50%',
        display: 'inline-flex',
        fontSize: '0.75rem',
        height: 25,
        justifyContent: 'center',
        width: 25,
      }}
    >
      {initial}
    </span>
  )
}
