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
    plural: 'YouTube',
    singular: 'YouTube',
  },
  fields: [
    {
      name: 'video',
      type: 'text',
      label: 'URL de YouTube',
      required: true,
      validate: (value: null | string | undefined) => {
        if (typeof value !== 'string' || !value.trim()) {
          return 'La URL de YouTube es obligatoria.'
        }

        if (!isValidYouTubeURL(value)) {
          return 'Ingresa una URL válida de video, short o enlace compartido de YouTube.'
        }

        return true
      },
    },
  ],
}
