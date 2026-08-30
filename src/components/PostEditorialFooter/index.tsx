import { Media } from '@/components/Media'
import type { Post, Profile } from '@/payload-types'

type EditorialProfile = Post['profile'] | Profile | null | undefined

function getEditorialProfile(profile: EditorialProfile) {
  if (!profile || typeof profile !== 'object') return null
  if ('profileType' in profile && profile.profileType === 'editorial') {
    return profile as Profile
  }
  if (!('editorialProfile' in profile) || !profile.editorialProfile) return null

  return profile as Profile
}

function getEditorialSocialLink(profile: Profile) {
  if (!Array.isArray(profile.socialLinks) || profile.socialLinks.length === 0) {
    return null
  }

  const firstLink = profile.socialLinks[0]
  const label = firstLink?.platform?.trim()
  const url = firstLink?.url?.trim()

  if (!label || !url) return null

  return {
    label,
    url,
  }
}

export default function PostEditorialFooter({ profile }: { profile: EditorialProfile }) {
  const editorialProfile = getEditorialProfile(profile)

  if (!editorialProfile) return null

  const socialLink = getEditorialSocialLink(editorialProfile)

  return (
    <footer className="mx-auto mt-12 max-w-[48rem] border-t border-border px-4 pt-8 md:px-0">
      <div className="flex items-start gap-4">
        {editorialProfile.avatar && typeof editorialProfile.avatar === 'object' ? (
          <Media
            resource={editorialProfile.avatar}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full"
            imgClassName="h-full w-full object-cover"
          />
        ) : null}

        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="text-2xl leading-tight">{editorialProfile.displayName}</h2>
          </div>

          {socialLink ? (
            <a
              href={socialLink.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm text-muted-foreground underline underline-offset-4"
            >
              {socialLink.label}
            </a>
          ) : null}

          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            El editor es dueño de su artículo, oddosund como plataforma editorial presta su uso
            en colaboración.
          </p>
        </div>
      </div>
    </footer>
  )
}
