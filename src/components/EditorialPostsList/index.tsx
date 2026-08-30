import { Media } from '@/components/Media'
import Link from 'next/link'

import type { Post, Profile } from '@/payload-types'
import { extractLexicalPlainText } from '@/utilities/extractLexicalPlainText'
import { extractTextContent } from '@/utilities/sharePost'

type EditorialPostListItem = Pick<Post, 'content' | 'heroImage' | 'publishedAt' | 'slug' | 'title'> & {
  profile?:
    | null
    | string
    | Pick<Profile, 'avatar' | 'displayName' | 'editorSocialLink' | 'slug'>
}

function formatPublishedDate(value: null | string | undefined) {
  if (!value) return ''

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsedDate)
}

function getExcerpt(content: Post['content']) {
  const plainText = extractLexicalPlainText(content)
  return extractTextContent(plainText, 4).replace(/\n/g, ' ').trim()
}

function getSocialLabel(profile?: null | Pick<Profile, 'editorSocialLink'>) {
  return profile?.editorSocialLink?.label?.trim() || ''
}

export default function EditorialPostsList({
  posts,
  showAuthor = false,
}: {
  posts: EditorialPostListItem[]
  showAuthor?: boolean
}) {
  return (
    <div className="space-y-9">
      {posts.map((post) => {
        const heroImage =
          post.heroImage && typeof post.heroImage === 'object' ? post.heroImage : null
        const publishedDate = formatPublishedDate(post.publishedAt)
        const excerpt = getExcerpt(post.content)
        const authorProfile = post.profile && typeof post.profile === 'object' ? post.profile : null
        const authorSocialLabel = getSocialLabel(authorProfile)
        const authorHref = authorProfile?.slug ? `/editor/${authorProfile.slug}` : null

        return (
          <article
            className="grid gap-5 md:grid-cols-[172px_minmax(0,1fr)] md:gap-7"
            key={post.slug}
          >
            <Link
              className="block overflow-hidden rounded-[24px] bg-[#d9d9d9]"
              href={`/posts/${post.slug}`}
            >
              {heroImage ? (
                <Media
                  resource={heroImage}
                  className="aspect-square h-full w-full"
                  imgClassName="h-full w-full object-cover"
                />
              ) : (
                <div className="aspect-square h-full w-full bg-[#d9d9d9]" />
              )}
            </Link>

            <div className="grid gap-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <Link href={`/posts/${post.slug}`}>
                  <h3 className="text-[2rem] font-black leading-none tracking-tight text-slate-900 transition-opacity hover:opacity-80 dark:text-white">
                    {post.title}
                  </h3>
                </Link>

                {publishedDate ? (
                  <time
                    className="shrink-0 pt-1 text-[13px] text-[#777] dark:text-[#858c98]"
                    dateTime={post.publishedAt || undefined}
                  >
                    {publishedDate}
                  </time>
                ) : null}
              </div>

              {excerpt ? (
                <p className="max-w-3xl text-sm leading-5 text-[#777] dark:text-[#858c98]">
                  {excerpt}
                </p>
              ) : null}

              {showAuthor && authorProfile ? (
                <div className="flex items-center gap-3 pt-1">
                  {authorHref ? (
                    <Link href={authorHref} className="shrink-0 transition-opacity hover:opacity-80">
                      {authorProfile.avatar && typeof authorProfile.avatar === 'object' ? (
                        <Media
                          resource={authorProfile.avatar}
                          className="h-10 w-10 overflow-hidden rounded-full bg-[#d9d9d9]"
                          imgClassName="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#d9d9d9]" />
                      )}
                    </Link>
                  ) : authorProfile.avatar && typeof authorProfile.avatar === 'object' ? (
                    <Media
                      resource={authorProfile.avatar}
                      className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#d9d9d9]"
                      imgClassName="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#d9d9d9]" />
                  )}

                  <div className="min-w-0">
                    {authorHref ? (
                      <Link
                        className="block text-[1.05rem] leading-5 text-slate-900 transition-opacity hover:opacity-80 dark:text-white"
                        href={authorHref}
                      >
                        {authorProfile.displayName}
                      </Link>
                    ) : (
                      <p className="text-[1.05rem] leading-5 text-slate-900 dark:text-white">
                        {authorProfile.displayName}
                      </p>
                    )}

                    {authorSocialLabel ? (
                      <p className="text-[10px] leading-4 text-[#777] dark:text-[#858c98]">
                        {authorSocialLabel}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
