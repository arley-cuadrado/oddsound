import type { Metadata } from 'next'

import React from 'react'

import { SITE_NAME } from '@/seo/site'
import { CartClient } from './CartClient'

export default function CartPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-16">
      <header className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">Carrito</h1>
      </header>

      <CartClient />
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    description: 'Revisa tu merch y paga a cada artista desde su propia tienda.',
    robots: { follow: false, index: false },
    title: `Carrito · ${SITE_NAME}`,
  }
}
