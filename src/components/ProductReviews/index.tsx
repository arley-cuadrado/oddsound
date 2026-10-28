'use client'
import React, { useCallback, useEffect, useState } from 'react'
const endpoint = '/creator-api/commerce/operations'
export function ProductReviews({ product }: { product: string }) {
  const [data, setData] = useState<any>(null),
    [page, setPage] = useState(1),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${endpoint}?action=reviews&product=${product}&page=${page}`, {
        cache: 'no-store',
      })
      const result = await r.json()
      if (!r.ok) throw new Error(result.message)
      setData(result)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudieron cargar las reseñas.')
    }
  }, [product, page])
  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])
  const act = async (action: string, values: any) => {
    setBusy(true)
    setMessage('')
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, product, ...values }),
      })
      if (!r.ok) throw new Error((await r.json()).message)
      setMessage(
        action === 'reportReview' ? 'Denuncia recibida para revisión.' : 'Reseña guardada.',
      )
      await refresh()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-5 border-t pt-8" aria-labelledby="product-reviews">
      <h2 id="product-reviews" className="text-xl">
        Opiniones del servicio del vendedor
      </h2>
      <p>
        Solo compradores con entrega verificada pueden reseñar. Las opiniones corresponden al
        servicio de la tienda.
      </p>
      <p role="status">{message}</p>
      {data?.eligible?.map((own: any) => (
        <form
          className="grid gap-3 rounded border p-4"
          key={own.order}
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            void act('saveReview', {
              orderID: own.order,
              stars: Number(f.get('stars')),
              body: f.get('body'),
            })
          }}
        >
          <p>Compra verificada · Pedido {own.order}</p>
          {own.hidden && (
            <p>Tu reseña está oculta por moderación. Editarla no cambia esa decisión.</p>
          )}
          <label>
            Calificación del vendedor
            <select name="stars" defaultValue={own.stars} className="block rounded border p-2">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {'★'.repeat(n)} · {n} de 5
                </option>
              ))}
            </select>
          </label>
          <label>
            Comentario sobre el servicio
            <textarea
              name="body"
              defaultValue={own.body}
              maxLength={2000}
              required
              className="block w-full rounded border p-3"
            />
          </label>
          <button disabled={busy}>Guardar reseña</button>
        </form>
      ))}
      {data && !data.eligible?.length && (
        <p>
          Podrás calificar desde tu cuenta de fan cuando la entrega de tu compra esté verificada.
        </p>
      )}
      {data?.reviews?.length === 0 && <p>Este producto aún no tiene reseñas.</p>}
      {data?.reviews?.map((r: any) => (
        <article key={r.id} className="space-y-2 rounded border p-4">
          <p aria-label={`${r.stars} de 5 estrellas`}>
            {'★'.repeat(r.stars)}
            {'☆'.repeat(5 - r.stars)}
          </p>
          <p>
            {r.publicName} · {new Date(r.createdAt).toLocaleDateString('es-CO')}
          </p>
          <p className="whitespace-pre-wrap">{r.body}</p>
          {data.canReport && (
            <details>
              <summary>Denunciar reseña</summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void act('reportReview', {
                    review: r.id,
                    reason: new FormData(e.currentTarget).get('reason'),
                  })
                }}
              >
                <label>
                  Motivo de la denuncia
                  <textarea name="reason" required maxLength={2000} />
                </label>
                <button disabled={busy}>Enviar denuncia</button>
              </form>
            </details>
          )}
        </article>
      ))}
      <div className="flex gap-3">
        <button disabled={page === 1 || busy} onClick={() => setPage(page - 1)}>
          Anterior
        </button>
        <span>Página {page}</span>
        <button
          disabled={!data || page * 20 >= data.total || busy}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </section>
  )
}
