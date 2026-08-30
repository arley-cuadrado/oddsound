import type { Metadata } from 'next/types'

import EditorialPostsList from '@/components/EditorialPostsList'
import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'
import PageClient from './page.client'
import { notFound } from 'next/navigation'

export const revalidate = 600

type Args = {
  params: Promise<{
    pageNumber: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { pageNumber } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const sanitizedPageNumber = Number(pageNumber)

  if (!Number.isInteger(sanitizedPageNumber)) notFound()

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    page: sanitizedPageNumber,
    overrideAccess: true,
    select: {
      content: true,
      heroImage: true,
      profile: true,
      publishedAt: true,
      slug: true,
      title: true,
    },
    sort: '-publishedAt',
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  return (
    <div className="mx-auto max-w-6xl pb-8 pt-6 md:pb-16 md:pt-10">
      <PageClient />
      <div className="container space-y-12">
        <header className="space-y-7 pb-8">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.28em] text-[#777] dark:text-[#858c98]">
              Oddosund Editorial
            </p>

            <div className="flex items-start gap-4 md:gap-6">
              <div className="h-14 w-14 shrink-0 rounded-full bg-[#d9d9d9] md:h-16 md:w-16" />

              <div className="min-w-0 space-y-2">
                <h1 className="text-[2.75rem] font-black leading-none tracking-tight text-slate-900 dark:text-white md:text-[4.6rem]">
                  Artículos
                </h1>
              </div>
            </div>
          </div>

          <p className="max-w-4xl text-sm leading-7 text-[#777] dark:text-[#858c98]">
            Aquí encontrarás todas las entradas de editores que colaboran con la plataforma.
          </p>

        </header>

        <div className="border-t border-border" />

        <section className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[2rem] font-medium tracking-tight text-slate-900 dark:text-white">
              Artículos
            </h2>
            <Link
              href="/"
              className="inline-flex items-center text-[13px] font-medium text-[#777] underline underline-offset-4 dark:text-[#858c98]"
            >
              Ir a inicio
            </Link>
          </div>

          <EditorialPostsList posts={posts.docs as any} showAuthor />
        </section>

        {posts?.page && posts?.totalPages > 1 && (
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { pageNumber } = await paramsPromise
  return {
    title: `Artículos | Página ${pageNumber || ''} | Oddsound Editorial`,
  }
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const { totalDocs } = await payload.count({
    collection: 'posts',
    overrideAccess: true,
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  const totalPages = Math.ceil(totalDocs / 12)

  const pages: { pageNumber: string }[] = []

  for (let i = 1; i <= totalPages; i++) {
    pages.push({ pageNumber: String(i) })
  }

  return pages
}
