'use client'

import { useEffect, useState } from 'react'

type CheckoutClientProps = {
  product: {
    id: string
    requiresShipping: boolean
    title: string
  }
  profileSlug: string
}

type QuoteResponse = {
  currencyCode: string
  shipping: {
    amountCOP: number
    estimatedBusinessDays: number
    zoneLabel?: null | string
  }
  subtotalCOP: number
  totals: {
    platformFeeAmountCOP: number
    totalAmountCOP: number
    unitAmountCOP: number
  }
}

const initialShippingAddress = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  country: 'CO',
  firstName: '',
  lastName: '',
  phone: '',
  postalCode: '',
  state: '',
}

export function CheckoutClient({ product, profileSlug }: CheckoutClientProps) {
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<null | string>(null)
  const [quote, setQuote] = useState<null | QuoteResponse>(null)
  const [shippingAddress, setShippingAddress] = useState(initialShippingAddress)

  useEffect(() => {
    if (product.requiresShipping) return

    void calculateQuote()
  }, [product.requiresShipping])

  async function calculateQuote() {
    const response = await fetch('/creator-api/checkout/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: product.id,
        quantity: 1,
        shippingAddress,
      }),
    })

    const data = (await response.json()) as QuoteResponse & { message?: string }

    if (!response.ok) {
      throw new Error(data.message || 'No fue posible calcular el checkout.')
    }

    setQuote(data)
    return data
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const nextQuote = quote || (await calculateQuote())
      const response = await fetch('/creator-api/checkout/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerEmail,
          customerName,
          productId: product.id,
          quantity: 1,
          shippingAddress: product.requiresShipping ? shippingAddress : undefined,
        }),
      })
      const data = (await response.json()) as { checkoutURL?: null | string; message?: string }

      if (!response.ok || !data.checkoutURL) {
        throw new Error(data.message || 'No fue posible crear la orden de pago.')
      }

      window.location.href = data.checkoutURL
      setQuote(nextQuote)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible iniciar el checkout.')
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
  }

  return (
    <form className="space-y-6 rounded-[28px] border border-border/70 bg-white/80 p-6 shadow-[0_18px_60px_rgba(49,46,46,0.08)]" onSubmit={onSubmit}>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/55">
          Marketplace checkout
        </p>
        <h2 className="text-2xl font-medium text-foreground">{product.title}</h2>
        <p className="text-[13px] leading-6 text-foreground/72">
          Oddsound procesara este pago con split automatico para que el fee de la plataforma y el saldo del artista queden registrados desde la orden.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-[13px] text-foreground/75">
          <span>Correo de compra</span>
          <input
            className="h-12 w-full rounded-[16px] border border-border bg-background px-4 text-foreground outline-none"
            onChange={(event) => setCustomerEmail(event.target.value)}
            required
            type="email"
            value={customerEmail}
          />
        </label>
        <label className="space-y-2 text-[13px] text-foreground/75">
          <span>Nombre completo</span>
          <input
            className="h-12 w-full rounded-[16px] border border-border bg-background px-4 text-foreground outline-none"
            onChange={(event) => setCustomerName(event.target.value)}
            required
            type="text"
            value={customerName}
          />
        </label>
      </div>

      {product.requiresShipping ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-[13px] text-foreground/75">
              <span>Nombres</span>
              <input
                className="h-12 w-full rounded-[16px] border border-border bg-background px-4 text-foreground outline-none"
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, firstName: event.target.value }))
                }
                required
                type="text"
                value={shippingAddress.firstName}
              />
            </label>
            <label className="space-y-2 text-[13px] text-foreground/75">
              <span>Apellidos</span>
              <input
                className="h-12 w-full rounded-[16px] border border-border bg-background px-4 text-foreground outline-none"
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, lastName: event.target.value }))
                }
                required
                type="text"
                value={shippingAddress.lastName}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-[13px] text-foreground/75">
              <span>Departamento</span>
              <input
                className="h-12 w-full rounded-[16px] border border-border bg-background px-4 text-foreground outline-none"
                onBlur={() => {
                  if (shippingAddress.state) void calculateQuote()
                }}
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, state: event.target.value }))
                }
                required
                type="text"
                value={shippingAddress.state}
              />
            </label>
            <label className="space-y-2 text-[13px] text-foreground/75">
              <span>Ciudad</span>
              <input
                className="h-12 w-full rounded-[16px] border border-border bg-background px-4 text-foreground outline-none"
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, city: event.target.value }))
                }
                required
                type="text"
                value={shippingAddress.city}
              />
            </label>
          </div>

          <label className="space-y-2 text-[13px] text-foreground/75">
            <span>Dirección principal</span>
            <input
              className="h-12 w-full rounded-[16px] border border-border bg-background px-4 text-foreground outline-none"
              onChange={(event) =>
                setShippingAddress((current) => ({ ...current, addressLine1: event.target.value }))
              }
              required
              type="text"
              value={shippingAddress.addressLine1}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-[13px] text-foreground/75">
              <span>Apto / detalle</span>
              <input
                className="h-12 w-full rounded-[16px] border border-border bg-background px-4 text-foreground outline-none"
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, addressLine2: event.target.value }))
                }
                type="text"
                value={shippingAddress.addressLine2}
              />
            </label>
            <label className="space-y-2 text-[13px] text-foreground/75">
              <span>Código postal</span>
              <input
                className="h-12 w-full rounded-[16px] border border-border bg-background px-4 text-foreground outline-none"
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, postalCode: event.target.value }))
                }
                type="text"
                value={shippingAddress.postalCode}
              />
            </label>
            <label className="space-y-2 text-[13px] text-foreground/75">
              <span>Teléfono</span>
              <input
                className="h-12 w-full rounded-[16px] border border-border bg-background px-4 text-foreground outline-none"
                onChange={(event) =>
                  setShippingAddress((current) => ({ ...current, phone: event.target.value }))
                }
                required
                type="tel"
                value={shippingAddress.phone}
              />
            </label>
          </div>
        </div>
      ) : null}

      {quote ? (
        <div className="rounded-[24px] border border-border/70 bg-background p-5">
          <div className="grid gap-3 text-[13px] text-foreground/75">
            <p>Subtotal: COP {quote.subtotalCOP.toLocaleString('es-CO')}</p>
            <p>
              Envío: COP {quote.shipping.amountCOP.toLocaleString('es-CO')}
              {quote.shipping.zoneLabel ? ` · ${quote.shipping.zoneLabel}` : ''}
            </p>
            <p>Fee Oddsound: COP {quote.totals.platformFeeAmountCOP.toLocaleString('es-CO')}</p>
            <p className="text-lg font-medium text-foreground">
              Total: COP {quote.totals.totalAmountCOP.toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-border bg-background p-5 text-[13px] text-foreground/72">
          {product.requiresShipping
            ? 'Completa el departamento para calcular el envío antes de pagar.'
            : 'Calcularemos el resumen final al iniciar el checkout.'}
        </div>
      )}

      {message ? (
        <p className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex h-12 items-center justify-center rounded-[18px] bg-[#312e2e] px-5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Preparando pago...' : 'Continuar al pago'}
        </button>
        <a
          className="inline-flex h-12 items-center justify-center rounded-[18px] border border-border bg-background px-5 text-[13px] font-medium text-foreground"
          href={`/${profileSlug}/shop`}
        >
          Volver al shop
        </a>
      </div>
    </form>
  )
}
