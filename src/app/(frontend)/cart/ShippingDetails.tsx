'use client'

import React, { useId } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/utilities/ui'

export type CheckoutContactForm = {
  addressLine1: string
  addressLine2: string
  city: string
  email: string
  name: string
  phone: string
  postalCode: string
  state: string
}

export const emptyContact: CheckoutContactForm = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  email: '',
  name: '',
  phone: '',
  postalCode: '',
  state: '',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function getMissingContactFields(
  contact: CheckoutContactForm,
  { requiresShipping }: { requiresShipping: boolean },
): (keyof CheckoutContactForm)[] {
  const missing: (keyof CheckoutContactForm)[] = []

  if (!EMAIL_PATTERN.test(contact.email.trim())) missing.push('email')
  if (!contact.name.trim()) missing.push('name')

  if (requiresShipping) {
    if (!contact.addressLine1.trim()) missing.push('addressLine1')
    if (!contact.city.trim()) missing.push('city')
    if (!contact.phone.trim()) missing.push('phone')
  }

  return missing
}

type ShippingDetailsProps = {
  contact: CheckoutContactForm
  highlightMissing: boolean
  onChange: (contact: CheckoutContactForm) => void
  requiresShipping: boolean
}

/**
 * One set of delivery details for the whole cart.
 *
 * The cart splits into a payment per artist, but the buyer is still one person
 * at one address, so this is asked once and reused by every group. Keeping it
 * visually quiet also matters: the artist cards below carry the message that
 * there are several payments, and a tall form would bury them.
 */
export const ShippingDetails: React.FC<ShippingDetailsProps> = ({
  contact,
  highlightMissing,
  onChange,
  requiresShipping,
}) => {
  const idPrefix = useId()
  const missing = highlightMissing
    ? getMissingContactFields(contact, { requiresShipping })
    : ([] as (keyof CheckoutContactForm)[])

  const field = (
    key: keyof CheckoutContactForm,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => {
    const invalid = missing.includes(key)

    return (
      <div className="space-y-1.5">
        <Label className="text-[12px] text-muted-foreground" htmlFor={`${idPrefix}-${key}`}>
          {label}
        </Label>
        <Input
          aria-invalid={invalid || undefined}
          className={cn('h-11 rounded-xl bg-background', invalid && 'border-destructive')}
          id={`${idPrefix}-${key}`}
          onChange={(event) => onChange({ ...contact, [key]: event.target.value })}
          value={contact[key]}
          {...props}
        />
      </div>
    )
  }

  return (
    <section className="rounded-[24px] border border-border bg-card p-5 md:p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Tus datos
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {field('name', 'Nombre completo', { autoComplete: 'name' })}
        {field('email', 'Correo', { autoComplete: 'email', inputMode: 'email', type: 'email' })}
      </div>

      {requiresShipping ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field('phone', 'Teléfono', { autoComplete: 'tel', inputMode: 'tel' })}
          {field('city', 'Ciudad', { autoComplete: 'address-level2' })}
          {field('addressLine1', 'Dirección', { autoComplete: 'address-line1' })}
          {field('addressLine2', 'Apartamento, torre, indicaciones', {
            autoComplete: 'address-line2',
          })}
          {field('state', 'Departamento', { autoComplete: 'address-level1' })}
          {field('postalCode', 'Código postal', { autoComplete: 'postal-code' })}
        </div>
      ) : null}
    </section>
  )
}
