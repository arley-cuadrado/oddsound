export interface SharePostData {
  title: string
  slug: string
  description: string
  imageUrl?: string
  authorName?: string
  authorAvatar?: string
}

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://oddsound.co'

export const generateShareUrls = (post: SharePostData) => {
  const postUrl = `${BASE_URL}/posts/${post.slug}`
  const text = `${post.title} - ${post.description.substring(0, 80)}...`
  const encodedUrl = encodeURIComponent(postUrl)
  const encodedText = encodeURIComponent(text)
  const encodedImage = encodeURIComponent(post.imageUrl || '')
  const encodedTitle = encodeURIComponent(post.title)

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    threads: `https://www.threads.net/intent/post?text=${encodedText}%20${encodedUrl}`,
    tiktok: `https://www.tiktok.com/`,
    instagram: `https://www.instagram.com/`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
  }
}

export const extractTextContent = (content: string, lines: number = 3): string => {
  // Remove HTML tags and get plain text
  const plainText = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()

  // Split into lines and take first N lines
  const textLines = plainText.split('\n').filter((line) => line.trim())
  return textLines.slice(0, lines).join('\n')
}
