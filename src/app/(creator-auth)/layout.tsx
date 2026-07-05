import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import React from 'react'

import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'

import '../(frontend)/globals.css'

export default function CreatorAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={cn(GeistMono.variable)} lang="es" suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          <main className="w-full">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
