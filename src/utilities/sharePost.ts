export interface SharePostData {
  title: string
  slug: string
  description: string
  urlPath?: string
  imageUrl?: string
  authorName?: string
  authorAvatar?: string
}

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://oddsound.co'

export const getSharePostURL = (slug: string) => `${BASE_URL}/posts/${slug}`

export const getShareURL = (urlPath: string) =>
  `${BASE_URL}${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`

export const getSharePostText = (post: SharePostData) =>
  `${post.title} - ${post.description.substring(0, 140).trim()}`

export const generateShareUrls = (post: SharePostData) => {
  const postUrl = post.urlPath ? getShareURL(post.urlPath) : getSharePostURL(post.slug)
  const text = getSharePostText(post)
  const encodedUrl = encodeURIComponent(postUrl)
  const encodedText = encodeURIComponent(text)

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    threads: `https://www.threads.net/intent/post?text=${encodedText}%20${encodedUrl}`,
    tiktok: postUrl,
    instagram: postUrl,
  }
}

export const extractTextContent = (content: string, lines: number = 3): string => {
  const plainText = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()

  const textLines = plainText.split('\n').filter((line) => line.trim())
  return textLines.slice(0, lines).join('\n')
}
