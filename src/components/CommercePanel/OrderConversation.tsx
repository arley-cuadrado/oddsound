'use client'
import React, { useCallback, useEffect, useState } from 'react'
const endpoint = '/creator-api/commerce/operations'

export function OrderConversation({ order }: { order: any }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `${endpoint}?action=conversation&orderID=${order.id}&page=${page}`,
        { cache: 'no-store' },
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.message)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la conversación.')
    }
  }, [order.id, page])
  const act = async (action: string, values: any) => {
    setBusy(true)
    setError('')
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, orderID: order.id, ...values }),
      })
      if (!r.ok) throw new Error((await r.json()).message)
      await refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar.')
    } finally {
      setBusy(false)
    }
    return false
  }
  useEffect(() => {
    if (!open) return
    const poll = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    poll()
    const timer = window.setInterval(poll, 30000)
    document.addEventListener('visibilitychange', poll)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [open, refresh])
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="rounded border p-3"
    >
      <summary>
        Conversación del pedido
        {(data?.unread ?? order.unreadMessages)
          ? ` · ${data?.unread ?? order.unreadMessages} sin leer`
          : ''}
      </summary>
      <p className="text-sm">Una consulta no abre un reclamo ni retiene dinero.</p>
      <p role="status">{error}</p>
      <ol className="space-y-3 py-3">
        {data?.messages?.map((m: any) => (
          <li key={m.id}>
            <strong>
              {m.mine
                ? 'Tú'
                : m.senderRole === 'seller'
                  ? 'Vendedor'
                  : m.senderRole === 'admin'
                    ? 'Administración'
                    : 'Comprador'}
            </strong>{' '}
            <time>{new Date(m.at).toLocaleString('es-CO')}</time>
            {m.product && (
              <p>
                {order.items?.find((i: any) => i.product === m.product)?.title ||
                  'Producto comprado'}
              </p>
            )}
            <p className="whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ol>
      {data?.cursor && page === 1 && (
        <button
          disabled={busy}
          type="button"
          onClick={() => void act('readConversation', { cursor: data.cursor })}
        >
          Marcar como leído
        </button>
      )}
      {data?.total > 30 && (
        <div>
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Más recientes
          </button>{' '}
          Página {page}{' '}
          <button
            type="button"
            disabled={page * 30 >= data.total}
            onClick={() => setPage(page + 1)}
          >
            Anteriores
          </button>
        </div>
      )}
      <form
        className="grid gap-3 py-3"
        onSubmit={async (e) => {
          e.preventDefault()
          const form = e.currentTarget
          const f = new FormData(form)
          if (await act('sendMessage', { body: f.get('body'), product: f.get('product') })) {
            form.reset()
            setPage(1)
          }
        }}
      >
        <label>
          Producto de la consulta
          <select name="product" className="w-full rounded border p-2">
            <option value="">Todo el pedido</option>
            {order.items?.map((i: any) => (
              <option key={i.product} value={i.product}>
                {i.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mensaje al participante
          <textarea name="body" required maxLength={5000} className="w-full rounded border p-2" />
        </label>
        <button disabled={busy}>Enviar consulta</button>
      </form>
    </details>
  )
}
