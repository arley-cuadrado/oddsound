import sharp from 'sharp'

const COVER_WIDTH = 900
const COVER_HEIGHT = 1200
const MAX_TITLE_LINES = 3
const TITLE_LINE_MAX_CHARS = 14

/** Stable 32-bit hash so a given slug always yields the same artwork. */
function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function escapeXML(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&apos;'
    }
  })
}

function wrapTitle(title: string) {
  const words = title.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word

    if (candidate.length > TITLE_LINE_MAX_CHARS && current) {
      lines.push(current)
      current = word
      return
    }

    current = candidate
  })

  if (current) lines.push(current)

  return lines.slice(0, MAX_TITLE_LINES)
}

type CoverArgs = {
  height?: number
  label: string
  seed: string
  subtitle?: string
  width?: number
}

export function buildCoverSVG({
  height = COVER_HEIGHT,
  label,
  seed,
  subtitle,
  width = COVER_WIDTH,
}: CoverArgs) {
  const hash = hashString(seed)
  const hueA = hash % 360
  const hueB = (hueA + 40 + (hash % 80)) % 360
  const tilt = -25 + (hash % 50)
  const orbX = 0.2 + ((hash >> 3) % 60) / 100
  const orbY = 0.15 + ((hash >> 7) % 45) / 100
  const orbR = 0.18 + ((hash >> 11) % 20) / 100
  const barY = 0.55 + ((hash >> 5) % 20) / 100

  const titleLines = wrapTitle(label)
  const titleSize = Math.round(width * 0.11)
  const titleBlockTop = height * 0.62

  // Text is a bonus layer: if the host has no fonts the gradient and geometry
  // still make every cover distinguishable.
  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="${width * 0.08}" y="${titleBlockTop + index * titleSize * 1.12}" font-family="Helvetica,Arial,sans-serif" font-size="${titleSize}" font-weight="700" fill="#ffffff" opacity="0.94">${escapeXML(line)}</text>`,
    )
    .join('')

  const subtitleMarkup = subtitle
    ? `<text x="${width * 0.08}" y="${titleBlockTop + titleLines.length * titleSize * 1.12 + titleSize * 0.55}" font-family="Helvetica,Arial,sans-serif" font-size="${Math.round(width * 0.042)}" fill="#ffffff" opacity="0.72">${escapeXML(subtitle)}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${tilt} 0.5 0.5)">
      <stop offset="0%" stop-color="hsl(${hueA} 62% 42%)"/>
      <stop offset="100%" stop-color="hsl(${hueB} 58% 18%)"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="rgb(0 0 0)" stop-opacity="0"/>
      <stop offset="100%" stop-color="rgb(0 0 0)" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${Math.round(width * orbX)}" cy="${Math.round(height * orbY)}" r="${Math.round(width * orbR)}" fill="hsl(${hueB} 80% 70%)" opacity="0.28"/>
  <circle cx="${Math.round(width * (1 - orbX * 0.7))}" cy="${Math.round(height * (orbY + 0.12))}" r="${Math.round(width * orbR * 0.55)}" fill="hsl(${hueA} 85% 78%)" opacity="0.2"/>
  <rect x="0" y="${Math.round(height * barY)}" width="${width}" height="${Math.round(height * 0.012)}" fill="#ffffff" opacity="0.35"/>
  <rect width="${width}" height="${height}" fill="url(#shade)"/>
  ${titleMarkup}
  ${subtitleMarkup}
</svg>`
}

/** Deterministic WebP cover. Small enough to stay far below the 1MB media cap. */
export async function generateCover(args: CoverArgs): Promise<Buffer> {
  return sharp(Buffer.from(buildCoverSVG(args)))
    .webp({ quality: 82 })
    .toBuffer()
}
