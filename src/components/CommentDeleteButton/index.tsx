'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  commentId: string
  className?: string
}

export function CommentDeleteButton({ className, commentId }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (isDeleting) return

    const confirmed = window.confirm('¿Seguro que quieres eliminar este comentario?')

    if (!confirmed) return

    setError(null)
    setIsDeleting(true)

    try {
      const response = await fetch(`/consumer-api/comments/${commentId}`, {
        method: 'DELETE',
      })
      const result = (await response.json().catch(() => null)) as { message?: string; ok?: boolean } | null

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || 'No fue posible eliminar el comentario.')
      }

      router.refresh()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Algo salió mal.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        className={className || 'text-[12px] text-foreground/65 underline underline-offset-2'}
        disabled={isDeleting}
        onClick={handleDelete}
        type="button"
      >
        {isDeleting ? 'Eliminando...' : 'Eliminar'}
      </button>

      {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
    </div>
  )
}
