export const formatRelativePublishedAt = (timestamp: string): string => {
  const publishedDate = new Date(timestamp)

  if (Number.isNaN(publishedDate.getTime())) return ''

  const now = new Date()
  const diffInMilliseconds = publishedDate.getTime() - now.getTime()
  const diffInDays = Math.round(diffInMilliseconds / (1000 * 60 * 60 * 24))

  if (Math.abs(diffInDays) < 1) return 'hoy'
  if (diffInDays === -1) return 'ayer'
  if (diffInDays === 1) return 'mañana'

  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  return rtf.format(diffInDays, 'day')
}
