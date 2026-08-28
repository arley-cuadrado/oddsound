import { describe, expect, it } from 'vitest'

import { Biographies } from '@/collections/Biographies'
import { extendEcommerceProductsCollection } from '@/collections/Commerce/officialProducts'
import { Pages } from '@/collections/Pages'
import { Posts } from '@/collections/Posts'

const editorUser = {
  editorAccess: true,
  id: 'editor-1',
  role: 'creator' as const,
}

const artistUser = {
  editorAccess: false,
  id: 'artist-1',
  role: 'creator' as const,
  userType: 'creator' as const,
}

const fanUser = {
  editorAccess: false,
  id: 'fan-1',
  role: 'creator' as const,
  userType: 'fan' as const,
}

const adminUser = {
  id: 'admin-1',
  role: 'admin' as const,
}

const baseReq = {
  payload: {},
} as any

describe('profile segmentation access', () => {
  const Products = extendEcommerceProductsCollection({
    defaultCollection: {
      fields: [],
      slug: 'products',
    } as any,
  })
  const postsHidden = Posts.admin?.hidden as (args: { user: unknown }) => boolean
  const pagesHidden = Pages.admin?.hidden as (args: { user: unknown }) => boolean
  const biographiesHidden = Biographies.admin?.hidden as (args: { user: unknown }) => boolean
  const productsHidden = Products.admin?.hidden as (args: { user: unknown }) => boolean

  it('shows editorial posts only to admins and editorial users', async () => {
    expect(postsHidden({ user: editorUser })).toBe(false)
    expect(postsHidden({ user: artistUser })).toBe(true)
    expect(postsHidden({ user: adminUser })).toBe(false)

    expect(Posts.access?.create?.({ req: { ...baseReq, user: editorUser } } as any)).toBe(true)
    expect(Posts.access?.create?.({ req: { ...baseReq, user: artistUser } } as any)).toBe(false)
  })

  it('shows music release pages only to admins and musical creators', async () => {
    expect(pagesHidden({ user: editorUser })).toBe(true)
    expect(pagesHidden({ user: artistUser })).toBe(false)
    expect(pagesHidden({ user: fanUser })).toBe(true)
    expect(pagesHidden({ user: adminUser })).toBe(false)

    await expect(Pages.access?.create?.({ req: { ...baseReq, user: artistUser } } as any)).resolves.toBe(
      true,
    )
    await expect(Pages.access?.create?.({ req: { ...baseReq, user: fanUser } } as any)).resolves.toBe(
      false,
    )
    await expect(Pages.access?.create?.({ req: { ...baseReq, user: editorUser } } as any)).resolves.toBe(
      false,
    )
  })

  it('shows biographies only to admins and musical creators', async () => {
    expect(biographiesHidden({ user: editorUser })).toBe(true)
    expect(biographiesHidden({ user: artistUser })).toBe(false)
    expect(biographiesHidden({ user: fanUser })).toBe(true)
    expect(biographiesHidden({ user: adminUser })).toBe(false)

    expect(Biographies.access?.create?.({ req: { ...baseReq, user: artistUser } } as any)).toBe(true)
    expect(Biographies.access?.create?.({ req: { ...baseReq, user: fanUser } } as any)).toBe(false)
    expect(Biographies.access?.create?.({ req: { ...baseReq, user: editorUser } } as any)).toBe(false)
  })

  it('keeps commerce products hidden in the dashboard for non-admin users', () => {
    expect(productsHidden({ user: editorUser })).toBe(true)
    expect(productsHidden({ user: artistUser })).toBe(true)
    expect(productsHidden({ user: fanUser })).toBe(true)
    expect(productsHidden({ user: adminUser })).toBe(false)

    expect(Products.access?.create?.({ req: { ...baseReq, user: artistUser } } as any)).toBe(true)
    expect(Products.access?.create?.({ req: { ...baseReq, user: fanUser } } as any)).toBe(false)
    expect(Products.access?.create?.({ req: { ...baseReq, user: editorUser } } as any)).toBe(false)
  })
})
