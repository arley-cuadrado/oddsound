import type { ReactNode } from 'react'
import React from 'react'

type Props = {
  description: ReactNode
  eyebrow?: ReactNode
  media?: ReactNode
  navigation: ReactNode
  title: ReactNode
}

export function ArtistProfileHeader({ description, eyebrow, media, navigation, title }: Props) {
  return (
    <header className="artist-profile-header">
      <div className="artist-profile-header__identity">
        {eyebrow ? <div className="artist-profile-header__eyebrow">{eyebrow}</div> : null}
        {media ? <div className="artist-profile-header__media">{media}</div> : null}
        <h1 className="artist-profile-header__title">{title}</h1>
      </div>
      <div className="artist-profile-header__description">{description}</div>
      <div className="artist-profile-header__navigation">{navigation}</div>
    </header>
  )
}
