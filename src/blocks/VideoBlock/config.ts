import type { Block } from 'payload'

function isValidYouTubeURL(value: null | string | undefined) {
  if (!value) return true

  try {
    const parsedURL = new URL(value)
    const hostname = parsedURL.hostname.replace(/^www\./, '')

    if (hostname === 'youtu.be') return Boolean(parsedURL.pathname.replace('/', ''))
    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (parsedURL.searchParams.get('v')) return true
      if (parsedURL.pathname.includes('/shorts/')) return true
    }

    return false
  } catch {
    return false
  }
}

export const VideoBlock: Block = {
  slug: 'videoBlock',
  interfaceName: 'VideoBlock',
  labels: {
    plural: 'Video',
    singular: 'Video',
  },
  fields: [
    {
      name: 'video',
      type: 'text',
      label: 'YouTube URL',
      required: true,
      validate: (value: null | string | undefined) => {
        if (typeof value !== 'string' || !value.trim()) {
          return 'A YouTube URL is required.'
        }

        if (!isValidYouTubeURL(value)) {
          return 'Enter a valid YouTube video, short, or share URL.'
        }

        return true
      },
    },
  ],
}
