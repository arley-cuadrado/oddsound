import { Media } from '@/components/Media'
import type { Post, Profile } from '@/payload-types'

type EditorialProfile = Post['profile'] | Profile | null | undefined

function getEditorialSubtitle(gender: Profile['editorGender']) {
  if (gender === 'female') return 'Editora'
  if (gender === 'male') return 'Editor'

  return 'Equipo editorial'
}

function normalizeSocialUrl(platform: 'facebook' | 'instagram' | 'threads' | 'x', value?: null | string) {
  const trimmed = value?.trim()

  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const normalized = trimmed.replace(/^@+/, '').replace(/^\/+|\/+$/g, '')

  if (!normalized) return null

  switch (platform) {
    case 'instagram':
      return `https://www.instagram.com/${normalized}`
    case 'x':
      return `https://x.com/${normalized}`
    case 'threads':
      return `https://www.threads.net/@${normalized}`
    case 'facebook':
      return `https://www.facebook.com/${normalized}`
    default:
      return null
  }
}

function getEditorialProfile(profile: EditorialProfile) {
  if (!profile || typeof profile !== 'object') return null
  if ('profileType' in profile && profile.profileType === 'editorial') {
    return profile as Profile
  }
  if (!('editorialProfile' in profile) || !profile.editorialProfile) return null

  return profile as Profile
}

export default function PostEditorialFooter({ profile }: { profile: EditorialProfile }) {
  const editorialProfile = getEditorialProfile(profile)

  if (!editorialProfile) return null

  const socialEntries = [
    {
      label: 'Instagram',
      url: normalizeSocialUrl('instagram', editorialProfile.editorSocials?.instagram),
    },
    {
      label: 'X',
      url: normalizeSocialUrl('x', editorialProfile.editorSocials?.x),
    },
    {
      label: 'Threads',
      url: normalizeSocialUrl('threads', editorialProfile.editorSocials?.threads),
    },
    {
      label: 'Facebook',
      url: normalizeSocialUrl('facebook', editorialProfile.editorSocials?.facebook),
    },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url))

  return (
    <footer className="mx-auto mt-12 max-w-[48rem] border-t border-border px-4 pt-8 md:px-0">
      <div className="flex items-start gap-4">
        {editorialProfile.avatar && typeof editorialProfile.avatar === 'object' ? (
          <Media
            resource={editorialProfile.avatar}
            className="relative h-16 w-16 shrink-0 overflow-hidden"
            imgClassName="h-full w-full object-cover"
          />
        ) : null}

        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">{getEditorialSubtitle(editorialProfile.editorGender)}</p>
            <h2 className="text-2xl leading-tight">{editorialProfile.displayName}</h2>
          </div>

          {socialEntries.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {socialEntries.map((item) => (
                <a
                  key={item.label}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {item.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
