'use client'
import React, { useCallback, useEffect, useState } from 'react'
const endpoint = '/creator-api/commerce/operations'
export function ReviewModeration() {
  const [data, setData] = useState<any>(null),
    [page, setPage] = useState(1),
    [message, setMessage] = useState('')
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${endpoint}?action=reviewModeration&page=${page}`)
      const result = await r.json()
      if (!r.ok) throw new Error(result.message)
      setData(result)
    } catch (e) {
      setMessage(String(e))
    }
  }, [page])
  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])
  return (
    <details>
      <summary>Reseñas denunciadas</summary>
      <p role="status">{message}</p>
      {data?.reports.map(
        (r: any) =>
          r.review && (
            <form
              key={r.id}
              onSubmit={async (e) => {
                e.preventDefault()
                const reason = new FormData(e.currentTarget).get('reason')
                const res = await fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'moderateReview',
                    review: r.review._id,
                    hidden: !r.review.hidden,
                    reason,
                  }),
                })
                setMessage(res.ok ? 'Decisión registrada.' : (await res.json()).message)
                await refresh()
              }}
            >
              <p>
                {r.review.stars}/5 · {r.review.body}
              </p>
              <p>Denuncia: {r.reason}</p>
              <label>
                Motivo de la decisión
                <input name="reason" required maxLength={2000} />
              </label>
              <button>{r.review.hidden ? 'Restaurar reseña' : 'Ocultar reseña'}</button>
            </form>
          ),
      )}
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
        Anterior
      </button>
      <button
        type="button"
        disabled={page * 20 >= (data?.total || 0)}
        onClick={() => setPage(page + 1)}
      >
        Siguiente
      </button>
    </details>
  )
}
