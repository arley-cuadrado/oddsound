import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { PostHero } from '@/heros/PostHero'
import { generateMeta } from '@/utilities/generateMeta'
import { getServerSideURL } from '@/utilities/getURL'
import { getPostShareData } from '@/utilities/getPostShareData'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import PostShareSection from '@/components/PostShareSection'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { ConsumerCommentsSection } from '@/components/ConsumerCommentsSection'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const posts = await payload.find({
    collection: 'posts',
    draft: false,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = posts.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/posts/' + decodedSlug
  const post = await queryPostBySlug({ slug: decodedSlug })

  if (!post) return <PayloadRedirects url={url} />

  return (
    <article className="mx-auto max-w-4xl pb-4 md:pb-12">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <PostHero post={post} />

      <div className="flex flex-col items-center gap-4 pt-4">
        <div className="container">
          <RichText
            className="post-editorial-prose mx-auto max-w-[48rem] px-4 md:px-0"
            data={post.content}
            enableGutter={false}
          />

          {Array.isArray(post.layout) && post.layout.length > 0 ? (
            <div className="mx-auto max-w-[48rem] px-4 md:px-0">
              <RenderBlocks blocks={post.layout} disableInnerContainer />
            </div>
          ) : null}
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <RelatedPosts
              className="col-start-1 col-span-3 mt-4 max-w-[52rem] px-4 md:px-0 lg:grid lg:grid-cols-subgrid grid-rows-[2fr]"
              docs={post.relatedPosts.filter((post) => typeof post === 'object')}
            />
          )}

          {post.profile ? (
            <div className="mx-auto max-w-[48rem] px-4 md:px-0">
              <ConsumerCommentsSection
                artistProfileId={
                  typeof post.profile === 'object' ? String(post.profile.id) : String(post.profile)
                }
                shareControl={<PostShareSection post={post} />}
                targetId={post.id}
                targetType="post"
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  if (!post) {
    return generateMeta({ doc: post })
  }

  const shareData = getPostShareData(post)
  const description =
    post.meta?.description?.trim() || shareData.summary || 'Oddsound - Be heard. Stay odd.'
  const baseTitle = post.meta?.title?.trim() || post.title.trim()
  const title = baseTitle ? `${baseTitle} | Oddsound` : 'Oddsound - Be heard. Stay odd.'
  const imageUrl = shareData.bannerImageUrl
    ? `${getServerSideURL()}${shareData.bannerImageUrl.startsWith('/') ? shareData.bannerImageUrl : `/${shareData.bannerImageUrl}`}`
    : undefined

  return {
    description,
    openGraph: mergeOpenGraph({
      description,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      title,
      type: 'article',
      url: shareData.urlPath,
    }),
    title,
    twitter: {
      card: 'summary_large_image',
      description,
      images: imageUrl ? [imageUrl] : undefined,
      title,
    },
  }
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        {
          slug: {
            equals: slug,
          },
        },
        ...(!draft
          ? [
              {
                _status: {
                  equals: 'published',
                },
              },
            ]
          : []),
      ],
    },
  })

  return result.docs?.[0] || null
})
