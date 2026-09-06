import React from 'react'

import { EcommerceContextProvider } from './Ecommerce'
import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <ThemeProvider>
      <HeaderThemeProvider>
        <EcommerceContextProvider>{children}</EcommerceContextProvider>
      </HeaderThemeProvider>
    </ThemeProvider>
  )
}
