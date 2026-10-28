'use client'
import Link from 'next/link'
import React, { useCallback, useEffect, useState } from 'react'
import { OrderConversation } from './OrderConversation'
import { ReviewModeration } from './ReviewModeration'

const endpoint = '/creator-api/commerce/operations'
const copy: Record<string, string> = {
  pending: 'Pendiente',
  shipped: 'Enviado',
  ready_to_ship: 'Por enviar',
  processing: 'Pago en proceso',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  pending_payment: 'Pendiente de pago',
  held: 'Retenido por reclamo',
  available: 'Disponible',
  in_transit: 'En desembolso',
  paid: 'Pagado',
  registered: 'Guía registrada',
  delivered: 'Entregado',
  exception: 'Novedad',
  returned: 'Devuelto',
  unverified: 'Por verificar',
  verified: 'Verificada',
  awaiting_seller: 'Esperando al vendedor',
  escalated: 'En mediación',
  refund_pending: 'Reembolso en proceso',
  dismissed: 'Cerrado sin reembolso',
  resolved: 'Resuelto',
  pending_approval: 'Requiere aprobación bancaria',
  unknown: 'Pendiente de conciliación',
  reserved: 'Reservado',
  failed: 'Fallido',
  completed: 'Completado',
  submitting: 'Enviando',
  open: 'En conversación',
}
const shipmentCopy: Record<string, string> = { ...copy, in_transit: 'En tránsito' }
const money = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format((value || 0) / 100)
const date = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Bogota',
      }).format(new Date(value))
    : 'Pendiente'
const inputClass = 'w-full rounded border border-border bg-background p-2 text-sm'
const buttonClass =
  'rounded border border-border bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50'

export function CommercePanel({
  mode = 'buyer',
  orderID: initialOrder,
}: {
  mode?: 'buyer' | 'artist' | 'admin'
  orderID?: string
}) {
  const [data, setData] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState('Resumen')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [bankOptions, setBankOptions] = useState<{ value: string; label: string }[]>([])
  const orderID = initialOrder || ''
  const [inspectedBank, setInspectedBank] = useState<any>(null)
  const refresh = useCallback(async () => {
    const response = await fetch(
      `${endpoint}?page=${page}&status=${encodeURIComponent(status)}${orderID ? `&orderID=${encodeURIComponent(orderID)}` : ''}`,
      { cache: 'no-store' },
    )
    const result = await response.json()
    if (response.ok) setData(result)
    else setMessage(result.message)
  }, [orderID, page, status])
  const act = async (action: string, values: Record<string, unknown>) => {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...values }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'No se pudo completar.')
      setMessage(result.message || 'Operación registrada.')
      if (result.details) setInspectedBank(result)
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar.')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (mode !== 'artist') return
    void fetch(`${endpoint}?action=banks`)
      .then(async (response) => {
        if (!response.ok) return
        const result = await response.json()
        setBankOptions(
          (result.banks || []).map((b: { id: string; name: string }) => ({
            value: b.id,
            label: b.name,
          })),
        )
      })
      .catch(() => {})
  }, [mode])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromURL = params.get('order')
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (token && fromURL) {
      window.history.replaceState({}, '', `/shop/orders?order=${encodeURIComponent(fromURL)}`)
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guestVerify', orderID: fromURL, token }),
      }).then(async (r) => {
        if (!r.ok) setMessage((await r.json()).message)
        else await refresh()
      })
    } else void Promise.resolve().then(refresh)
  }, [refresh])

  return (
    <section id="commerce-operations" className="space-y-6 rounded-xl border border-border p-5">
      <header>
        <h2 className="text-xl font-medium">
          {mode === 'admin'
            ? 'Operación de comercio'
            : mode === 'artist'
              ? 'Ingresos y pedidos'
              : 'Mis compras y envíos'}
        </h2>
        {data?.nextPayout && mode !== 'buyer' && (
          <p className="text-sm text-muted-foreground">
            Próximo envío de liquidación: {date(data.nextPayout)}. La acreditación depende del
            banco.
          </p>
        )}
      </header>
      {mode === 'artist' && (
        <nav aria-label="Secciones de productos" className="flex flex-wrap gap-3" role="tablist">
          {['Resumen', 'Pedidos y envíos', 'Mensajes', 'Reclamos', 'Cuenta bancaria'].map(
            (name) => (
              <button
                type="button"
                role="tab"
                aria-selected={tab === name}
                key={name}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ),
          )}
        </nav>
      )}
      {mode !== 'buyer' && (mode === 'admin' || tab === 'Resumen') && data?.summary && (
        <section aria-label="Resumen completo de ventas">
          <p>
            {
              ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][
                data.payoutWeekday ?? 3
              ]
            }{' '}
            a las {data.payoutHour ?? 9}:00 · America/Bogota
          </p>
          <p>
            Desembolso sujeto a entrega verificada, siete días de espera, conciliación y ausencia de
            bloqueos.
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries({
              'Ventas de productos': data.summary.sales,
              Comisiones: data.summary.commission,
              'Procesamiento conciliado': data.summary.processorCost,
              Devoluciones: data.summary.refunds,
              ...Object.fromEntries(
                Object.entries(data.summary.buckets).map(([k, v]) => [copy[k], v]),
              ),
            }).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{money(Number(value))}</dd>
              </div>
            ))}
          </dl>
          <p>Unidades vendidas: {data.summary.units}</p>
          {data.summary.unreconciled > 0 && (
            <p>
              Costos pendientes de determinar en {data.summary.unreconciled} pedidos. El importe
              final puede cambiar.
            </p>
          )}
        </section>
      )}
      {mode === 'admin' && <ReviewModeration />}
      <p role="status" className="text-sm" aria-live="polite">
        {message || (!data ? 'Cargando pedidos y saldos…' : '')}
      </p>
      {mode === 'buyer' && (
        <details open={!data}>
          <summary>Consultar una compra por correo</summary>
          <Form
            busy={busy}
            submit="Enviar enlace de acceso"
            onSubmit={(v) => act('guestRequest', { orderID: v.orderID, email: v.email })}
            fields={[
              ['orderID', 'Número de pedido', 'text'],
              ['email', 'Correo de la compra', 'email'],
            ]}
          />
        </details>
      )}
      {mode === 'artist' && tab === 'Cuenta bancaria' && (
        <details open>
          <summary>
            Cuenta bancaria · {copy[data?.bank?.state] || 'Sin registrar'}{' '}
            {data?.bank?.lastFour && `····${data.bank.lastFour}`}
          </summary>
          <p className="text-sm text-muted-foreground">
            Un cambio deja los desembolsos en espera hasta verificar nuevamente la titularidad.
          </p>
          <Form
            busy={busy}
            submit="Guardar cuenta para verificación"
            selectOptions={{
              bankId: bankOptions,
              accountType: [
                { value: 'AHORROS', label: 'Ahorros' },
                { value: 'CORRIENTE', label: 'Corriente' },
              ],
              legalIdType: [
                { value: 'CC', label: 'Cédula de ciudadanía' },
                { value: 'CE', label: 'Cédula de extranjería' },
                { value: 'NIT', label: 'NIT' },
              ],
            }}
            onSubmit={(v) => act('bank', { details: v })}
            fields={[
              ['name', 'Titular', 'text'],
              ['legalIdType', 'Tipo de documento (CC, NIT, CE)', 'text'],
              ['legalId', 'Documento', 'text'],
              ['bankId', 'Banco', 'text'],
              ['accountType', 'Tipo de cuenta (AHORROS o CORRIENTE)', 'text'],
              ['accountNumber', 'Número de cuenta', 'text'],
              ['email', 'Correo del titular', 'email'],
            ]}
          />
        </details>
      )}
      {mode === 'admin' && (
        <div className="space-y-4">
          <Link href="/dashboard/globals/commerceSettings" className="underline">
            Comisión, calendario, fondos propios e interruptores de operación
          </Link>
          <Form
            busy={busy}
            submit="Conciliar saldo disponible"
            onSubmit={(v) =>
              act('attestBalance', {
                amount: Math.round(Number(v.amount) * 100),
                evidence: v.evidence,
              })
            }
            fields={[
              ['amount', 'Saldo externo comprobado (COP)', 'number'],
              ['evidence', 'Referencia y fecha del extracto', 'text'],
            ]}
          />
          <CarrierAdmin
            busy={busy}
            act={act}
            report={setMessage}
            carriers={data?.carrierAssessments || []}
          />
          {data?.banks?.map((bank: any) => (
            <div className="rounded border p-3" key={bank.artist}>
              <p>
                Artista {bank.artist}: ····{bank.lastFour} · {copy[bank.state]}
              </p>
              <button
                className={buttonClass}
                disabled={busy}
                onClick={() => void act('inspectBank', { artist: bank.artist })}
              >
                Revisar titularidad
              </button>
              <Form
                busy={busy}
                submit="Verificar cuenta"
                fields={[['evidence', 'Evidencia de titularidad', 'text']]}
                onSubmit={(v) =>
                  act('verifyBank', {
                    artist: bank.artist,
                    revision: bank.revision,
                    evidence: v.evidence,
                  })
                }
              />
            </div>
          ))}
          {inspectedBank && (
            <div className="rounded border p-3">
              <h3>Datos privados para verificar titularidad</h3>
              {Object.entries(inspectedBank.details).map(([key, value]) => (
                <p key={key}>
                  {key}: {String(value)}
                </p>
              ))}
              <button onClick={() => setInspectedBank(null)}>Ocultar</button>
            </div>
          )}
          {data?.alerts?.map((a: any) => (
            <p role="alert" key={a.reference}>
              Requiere revisión: {a.kind} · {a.error}
            </p>
          ))}
          {data?.refunds
            ?.filter((r: any) => r.state !== 'completed')
            .map((r: any) => (
              <div key={r.reference}>
                <p>
                  Reembolso {r.reference}: {money(r.amount)} · {copy[r.state]}
                </p>
                <Form
                  busy={busy}
                  submit="Confirmar devolución ejecutada"
                  fields={[['evidence', 'Referencia verificable del abono', 'text']]}
                  onSubmit={(v) =>
                    act('confirmRefund', { reference: r.reference, evidence: v.evidence })
                  }
                />
              </div>
            ))}
        </div>
      )}
      {(mode !== 'artist' || ['Pedidos y envíos', 'Mensajes', 'Reclamos'].includes(tab)) && (
        <div className="flex flex-wrap gap-3">
          <label>
            Estado del envío
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos</option>
              {['pending_payment', 'ready_to_ship', 'shipped', 'delivered'].map((s) => (
                <option key={s} value={s}>
                  {copy[s]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Anterior
          </button>
          <span>Página {page}</span>
          <button
            type="button"
            disabled={page * 20 >= (data?.total || 0)}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
      {data?.orders?.length === 0 && <p>Todavía no hay pedidos.</p>}
      {(mode !== 'artist' || ['Pedidos y envíos', 'Mensajes', 'Reclamos'].includes(tab)) &&
        data?.orders?.map((order: any) => (
          <article key={order.id} className="space-y-4 border-t border-border pt-5">
            <h3 className="font-medium">
              Pedido {order.id} · {money(order.total * 100)}
            </h3>
            <p>{order.artistName || 'Tienda'}</p>
            <ul>
              {order.items?.map((i: any) => (
                <li key={i.product}>
                  {i.title} × {i.quantity}
                </li>
              ))}
            </ul>
            {(mode !== 'artist' || tab === 'Pedidos y envíos') && (
              <>
                <p className="text-sm">
                  {copy[order.fulfillmentStatus] || order.fulfillmentStatus} ·{' '}
                  {copy[order.status] || order.status}
                </p>
                {mode !== 'buyer' && (
                  <>
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {Object.entries(order.finance.buckets).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs text-muted-foreground">{copy[key]}</dt>
                          <dd>{money(Number(value))}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-sm">
                      Comisión Oddsound: {money(order.commission * 100)} · Procesamiento:{' '}
                      {order.finance.reconciledAt
                        ? money(order.processorCost * 100)
                        : 'Pendiente de conciliación'}
                    </p>
                  </>
                )}
                <p className="text-xs">
                  Despacho previsto hasta: {date(order.finance.dispatchBy)} · Entrega verificada:{' '}
                  {date(order.finance.deliveredAt)}
                </p>
                {order.shipments.map((s: any) => (
                  <div key={s.id} className="rounded border p-3 text-sm">
                    <p>
                      {s.carrier} · Guía {s.guide} · {shipmentCopy[s.state]}
                    </p>
                    <p>
                      Fuente: {s.source || 'Sin consulta automática'} · Última consulta:{' '}
                      {date(s.lastCheckedAt)} ·{' '}
                      {s.verifiedAt ? 'Entrega verificada' : 'Verificación pendiente'}
                    </p>
                    {s.estimatedDeliveryAt && (
                      <p>Estimación de la transportadora: {date(s.estimatedDeliveryAt)}</p>
                    )}
                    {(s.error ||
                      (s.lastCheckedAt &&
                        Date.now() - Date.parse(s.lastCheckedAt) > 8 * 60 * 60 * 1000)) && (
                      <p>Seguimiento desactualizado. {s.error || 'Consulta el enlace oficial.'}</p>
                    )}
                    <a
                      className="underline"
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Consultar transportadora
                    </a>
                    <ol>
                      {s.history?.map((e: any, i: number) => (
                        <li key={i}>
                          {date(e.at)} · {e.description}
                        </li>
                      ))}
                    </ol>
                    {mode === 'admin' && !s.verifiedAt && (
                      <Form
                        busy={busy}
                        submit="Verificar entrega y destinatario"
                        fields={[
                          ['deliveredAt', 'Fecha de entrega con zona horaria', 'text'],
                          ['evidence', 'Prueba de entrega y relación con el pedido', 'text'],
                        ]}
                        onSubmit={(v) => act('verifyDelivery', { shipmentID: s.id, ...v })}
                      />
                    )}
                  </div>
                ))}
                {mode === 'buyer' && <TrackingLookup shipments={order.shipments} />}
                {mode === 'artist' && order.items && (
                  <ShipmentForm
                    order={order}
                    carriers={data.carriers}
                    busy={busy}
                    submit={(v) => act('shipment', { orderID: order.id, ...v })}
                  />
                )}
                {mode === 'admin' && order.finance.paidAt && !order.finance.reconciledAt && (
                  <Form
                    busy={busy}
                    submit="Conciliar recaudo y costo real"
                    fields={[
                      ['cost', 'Costo real de procesamiento (COP)', 'number'],
                      ['evidence', 'Referencia del recaudo disponible y extracto', 'text'],
                    ]}
                    onSubmit={(v) =>
                      act('reconcile', {
                        orderID: order.id,
                        cost: Math.round(Number(v.cost) * 100),
                        evidence: v.evidence,
                      })
                    }
                  />
                )}
              </>
            )}
            {(mode !== 'artist' || tab === 'Mensajes') &&
              (order.finance.paidAt || order.status === 'completed') && (
                <OrderConversation order={order} />
              )}
            {(mode !== 'artist' || tab === 'Reclamos') && (
              <>
                {mode !== 'artist' && order.finance.paidAt && (
                  <ClaimForm
                    order={order}
                    busy={busy}
                    submit={(values) => act('openCase', { orderID: order.id, ...values })}
                  />
                )}
                {order.cases.map((c: any) => (
                  <section key={c.id} className="space-y-2 rounded border p-3">
                    <h4>
                      Reclamo · {copy[c.state]} · {money(c.amount)}
                    </h4>
                    <p className="text-xs">Respuesta del vendedor hasta: {date(c.respondBy)}</p>
                    {c.messages?.map((m: any, i: number) => (
                      <p className="text-sm" key={i}>
                        {date(m.at)} ·{' '}
                        {m.message.startsWith('Adjunto: ') ? (
                          <a
                            className="underline"
                            href={`${endpoint}?action=downloadAttachment&caseID=${c.id}&attachmentID=${m.message.slice(9)}`}
                          >
                            Descargar evidencia privada
                          </a>
                        ) : (
                          m.message
                        )}
                      </p>
                    ))}
                    {c.decision && <p>Resolución: {c.decision}</p>}
                    {!['resolved', 'dismissed'].includes(c.state) && (
                      <>
                        <Form
                          busy={busy}
                          submit="Enviar mensaje"
                          fields={[['message', 'Mensaje', 'text']]}
                          onSubmit={(v) => act('message', { caseID: c.id, ...v })}
                        />
                        <label className="block text-sm">
                          Adjuntar evidencia privada (PNG, JPEG o PDF, máximo 2 MB)
                          <input
                            type="file"
                            accept="image/png,image/jpeg,application/pdf"
                            disabled={busy}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 2 * 1024 * 1024) {
                                setMessage('El archivo excede 2 MB.')
                                return
                              }
                              const bytes = new Uint8Array(await file.arrayBuffer())
                              let raw = ''
                              for (const byte of bytes) raw += String.fromCharCode(byte)
                              await act('attachment', {
                                caseID: c.id,
                                name: file.name,
                                mime: file.type,
                                content: btoa(raw),
                              })
                            }}
                          />
                        </label>
                      </>
                    )}
                    {mode === 'admin' &&
                      !['resolved', 'dismissed', 'refund_pending'].includes(c.state) && (
                        <Form
                          busy={busy}
                          submit="Resolver reclamo"
                          fields={[
                            ['refund', 'Reembolso aprobado (COP; 0 para cerrar)', 'number'],
                            ['decision', 'Decisión y evidencia', 'text'],
                            [
                              'sellerFault',
                              'Incumplimiento confirmado atribuible al vendedor',
                              'checkbox',
                            ],
                          ]}
                          onSubmit={(v) =>
                            act('decideCase', {
                              caseID: c.id,
                              refund: Math.round(Number(v.refund) * 100),
                              decision: v.decision,
                              sellerFault: v.sellerFault === 'on',
                            })
                          }
                        />
                      )}
                  </section>
                ))}
              </>
            )}
          </article>
        ))}
      {mode !== 'buyer' && (mode === 'admin' || tab === 'Resumen') && data?.payouts?.length > 0 && (
        <section>
          <h3>Liquidaciones</h3>
          {data.payouts.map((p: any) => (
            <div className="space-y-2 border-t py-3" key={p.reference}>
              <p className="text-sm">
                {date(p.cycle)} · {money(p.amount)} · {copy[p.state] || p.state} · {p.reference}
              </p>
              {p.error && <p className="text-sm">{p.error}</p>}
              {mode === 'admin' && p.state === 'unknown' && (
                <Form
                  busy={busy}
                  submit="Asociar lote verificado"
                  fields={[
                    ['providerID', 'ID del lote en Wompi', 'text'],
                    ['evidence', 'Evidencia de conciliación', 'text'],
                  ]}
                  onSubmit={(v) => act('associatePayout', { reference: p.reference, ...v })}
                />
              )}
              {mode === 'admin' && p.state === 'reserved' && (
                <Form
                  busy={busy}
                  submit="Cancelar liquidación aún no enviada"
                  fields={[['evidence', 'Motivo', 'text']]}
                  onSubmit={(v) => act('cancelPayout', { reference: p.reference, ...v })}
                />
              )}
              {mode === 'admin' && p.state === 'paid' && (
                <Form
                  busy={busy}
                  submit="Conciliar costo asumido por Oddsound"
                  fields={[
                    ['cost', 'Costo de dispersión (COP)', 'number'],
                    ['evidence', 'Extracto', 'text'],
                  ]}
                  onSubmit={(v) =>
                    act('reconcilePayoutFee', {
                      reference: p.reference,
                      cost: Math.round(Number(v.cost) * 100),
                      evidence: v.evidence,
                    })
                  }
                />
              )}
            </div>
          ))}
        </section>
      )}
    </section>
  )
}

function ClaimForm({
  order,
  busy,
  submit,
}: {
  order: any
  busy: boolean
  submit: (values: any) => Promise<unknown>
}) {
  return (
    <details>
      <summary>Abrir un reclamo formal</summary>
      <p>Esta acción activa la revisión y retención financiera del reclamo.</p>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const values = new FormData(e.currentTarget)
          void submit({
            amount: Math.round(Number(values.get('amount')) * 100),
            message: values.get('message'),
            allocations: order.items
              .map((i: any) => ({
                product: i.product,
                quantity: Number(values.get(i.product) || 0),
              }))
              .filter((a: any) => a.quantity > 0),
          })
        }}
      >
        <label>
          Importe reclamado (COP)
          <input
            className={inputClass}
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
          />
        </label>
        {order.items?.map((i: any) => (
          <label key={i.product}>
            {i.title} · unidades reclamadas
            <input
              className={inputClass}
              type="number"
              name={i.product}
              min="0"
              max={i.quantity}
              step="1"
              defaultValue={i.quantity}
            />
          </label>
        ))}
        <label>
          Describe el problema y los productos afectados
          <textarea className={inputClass} name="message" required maxLength={5000} />
        </label>
        <button className={buttonClass} disabled={busy}>
          Abrir reclamo
        </button>
      </form>
    </details>
  )
}

function Form({
  fields,
  onSubmit,
  submit,
  busy,
  selectOptions,
}: {
  selectOptions?: Record<string, { value: string; label: string }[]>
  fields: [string, string, string][]
  onSubmit: (values: Record<string, string>) => Promise<unknown>
  submit: string
  busy: boolean
}) {
  return (
    <form
      className="my-3 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        void onSubmit(
          Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>,
        )
      }}
    >
      {fields.map(([name, label, type]) => (
        <label className="text-sm" key={name}>
          {label}
          {selectOptions?.[name] ? (
            <select className={inputClass} name={name} required>
              <option value="">Selecciona una opción</option>
              {selectOptions[name].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={inputClass}
              name={name}
              type={type}
              required={type !== 'checkbox'}
              {...(type === 'number' ? { min: 0, step: '0.01' } : {})}
            />
          )}
        </label>
      ))}
      <button className={buttonClass} disabled={busy} type="submit">
        {busy ? 'Guardando…' : submit}
      </button>
    </form>
  )
}
function ShipmentForm({
  order,
  carriers,
  busy,
  submit,
}: {
  order: any
  carriers: any[]
  busy: boolean
  submit: (v: any) => Promise<unknown>
}) {
  return (
    <details>
      <summary>Registrar guía y unidades</summary>
      <form
        className="grid gap-3 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          void submit({
            carrier: f.get('carrier'),
            guide: f.get('guide'),
            allocations: order.items
              .map((x: any) => ({ product: x.product, quantity: Number(f.get(x.product) || 0) }))
              .filter((x: any) => x.quantity > 0),
          })
        }}
      >
        <select className={inputClass} name="carrier">
          {carriers.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <label>
          Número de guía
          <input className={inputClass} name="guide" required />
        </label>
        {order.items.map((x: any) => (
          <label key={x.product}>
            {x.title} · unidades en esta guía
            <input
              className={inputClass}
              name={x.product}
              type="number"
              min="0"
              max={Math.max(
                0,
                x.quantity -
                  (order.shipments || [])
                    .flatMap((s: any) => s.allocations || [])
                    .filter((a: any) => a.product === x.product)
                    .reduce((n: number, a: any) => n + a.quantity, 0),
              )}
              step="1"
              defaultValue="0"
            />
          </label>
        ))}
        <button className={buttonClass} disabled={busy}>
          Registrar envío
        </button>
      </form>
    </details>
  )
}
function TrackingLookup({ shipments }: { shipments: any[] }) {
  const [guide, setGuide] = useState('')
  const found = shipments.find((s) => s.guide === guide.trim())
  return (
    <div>
      <label className="text-sm">
        Consultar una guía de este pedido
        <input className={inputClass} value={guide} onChange={(e) => setGuide(e.target.value)} />
      </label>
      {guide && (
        <p>
          {found
            ? `${shipmentCopy[found.state]} · Última actualización ${date(found.lastCheckedAt)}`
            : 'La guía no corresponde a este pedido.'}
        </p>
      )}
    </div>
  )
}

function CarrierAdmin({
  busy,
  act,
  report,
  carriers,
}: {
  busy: boolean
  act: (action: string, values: Record<string, unknown>) => Promise<void>
  report: (message: string) => void
  carriers: any[]
}) {
  return (
    <details>
      <summary>Transportadoras y cobertura automática</summary>
      {carriers.map((c) => (
        <p className="text-sm" key={c.code}>
          {c.name}: API {c.apiEnabled ? 'habilitada' : 'deshabilitada'} · consulta web{' '}
          {c.scrapingEnabled ? 'habilitada' : 'deshabilitada'}
        </p>
      ))}
      <Form
        busy={busy}
        submit="Añadir operador evaluado"
        fields={[
          ['code', 'Identificador del operador', 'text'],
          ['name', 'Nombre', 'text'],
          ['officialURL', 'URL oficial HTTPS', 'url'],
          ['evidence', 'Identidad y habilitación aplicable', 'text'],
        ]}
        onSubmit={(v) =>
          act('registerCarrier', {
            code: v.code,
            name: v.name,
            officialURL: v.officialURL,
            assessment: { evidence: v.evidence },
          })
        }
      />
      <Form
        busy={busy}
        submit="Configurar conectores evaluados"
        fields={[
          ['code', 'Identificador del operador', 'text'],
          ['evidence', 'Evaluación de acceso y pruebas con guías', 'text'],
          ['authorizedGuidesTested', 'Guías autorizadas probadas', 'checkbox'],
          ['apiEnabled', 'Habilitar API', 'checkbox'],
          ['scrapingEnabled', 'Habilitar consulta web', 'checkbox'],
          ['apiConfig', 'Configuración API (JSON; {} para deshabilitada)', 'text'],
          ['scrapingConfig', 'Configuración web (JSON; {} para deshabilitada)', 'text'],
        ]}
        onSubmit={async (v) => {
          try {
            const apiConfig = JSON.parse(v.apiConfig),
              scrapingConfig = JSON.parse(v.scrapingConfig)
            await act('configureCarrier', {
              code: v.code,
              apiConfig,
              scrapingConfig,
              apiEnabled: v.apiEnabled === 'on',
              scrapingEnabled: v.scrapingEnabled === 'on',
              assessment: {
                evidence: v.evidence,
                authorizedGuidesTested: v.authorizedGuidesTested === 'on',
              },
            })
          } catch {
            report('La configuración de los conectores debe ser JSON válido.')
          }
        }}
      />
    </details>
  )
}
