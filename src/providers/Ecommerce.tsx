'use client'

import { EcommerceProvider } from '@payloadcms/plugin-ecommerce/client/react'
import React from 'react'

import { currenciesConfig } from '@/config/currencies'

/**
 * Cart state for the whole public site.
 *
 * Fetched at depth 2 on purpose: the cart page groups its lines by artist, and
 * reaching the artist means walking item → product → profile. Anything shallower
 * would need a second request per product just to draw the cart.
 */
export const EcommerceContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <EcommerceProvider
      api={{
        cartsFetchQuery: {
          depth: 2,
        },
      }}
      currenciesConfig={currenciesConfig}
      enableVariants={false}
      syncLocalStorage
    >
      {children}
    </EcommerceProvider>
  )
}
