export function formatCommentDate(value?: null | string) {
  if (!value) return null

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
