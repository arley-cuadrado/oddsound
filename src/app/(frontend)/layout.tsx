import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import {
  getSiteStructuredData,
  HOME_DESCRIPTION,
  SITE_TITLE,
} from '@/seo/site'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const structuredData = getSiteStructuredData()

  return (
    <html className={cn(GeistMono.variable)} lang="es" suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          type="application/ld+json"
        />
      </head>
      <body>
        <Providers>
          <div className="flex">
            <AdminBar
              adminBarProps={{
                preview: isEnabled,
              }}
            />

            <Header />
            <main className="w-full pt-[var(--admin-bar-offset,0px)] max-[975px]:pt-[calc(var(--admin-bar-offset,0px)+5rem)] max-[975px]:pb-[var(--mobile-page-bottom-offset,6rem)]">
              {children}
            </main>
            {/*<Footer />*/}
          </div>
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  title: SITE_TITLE,
  description: HOME_DESCRIPTION,
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: HOME_DESCRIPTION,
    images: [`${getServerSideURL()}/oddsound_main_share_image.jpg`],
  },
}
