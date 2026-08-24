'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

type Props = {
  artistProfileId: string
  releaseId: string
}

export function ReleaseCommentsForm({ artistProfileId, releaseId }: Props) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/consumer-api/comments', {
        body: JSON.stringify({
          artistProfile: artistProfileId,
          content,
          release: releaseId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const result = (await response.json().catch(() => null)) as { message?: string; ok?: boolean } | null

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || 'No fue posible enviar tu comentario.')
      }

      setContent('')
      setMessage('Tu comentario quedó enviado y está pendiente de revisión.')
      router.refresh()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Algo salió mal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="release-comment">
          Escribe tu comentario
        </label>
        <textarea
          className="min-h-[120px] w-full border border-border bg-background px-4 py-3 text-[13px] text-foreground outline-none"
          id="release-comment"
          maxLength={1000}
          name="content"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Comparte tu impresión sobre este lanzamiento."
          required
          value={content}
        />
      </div>

      {error ? (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="border border-border px-4 py-3 text-[13px] text-foreground/80">{message}</p>
      ) : null}

      <button
        className="inline-flex h-11 items-center justify-center bg-[#312e2e] px-5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar comentario'}
      </button>
    </form>
  )
}
