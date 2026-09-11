import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { findCreatorProfileByOwner } from '../../src/utilities/creatorProfiles'

const creatorUser = {
  accountType: 'artist' as const,
  email: 'creator-mobile-nav@oddsound.test',
  name: 'Creator Mobile Nav',
  password: 'test',
  role: 'creator' as const,
  userType: 'creator' as const,
  username: 'creator-mobile-nav',
}

const menuFlows = [
  {
    label: 'Lanzamientos',
    targetFragment: '/dashboard/collections/pages',
    urlPattern: /\/dashboard\/collections\/pages(?:\/|$)/,
  },
  {
    label: 'Biografía',
    targetFragment: '/dashboard/collections/biographies',
    urlPattern: /\/dashboard\/collections\/biographies(?:\/|$)/,
  },
  {
    label: 'Imágenes',
    targetFragment: '/dashboard/collections/media',
    urlPattern: /\/dashboard\/collections\/media(?:\/|$)/,
  },
  {
    label: 'Perfil',
    targetFragment: '/dashboard/collections/profiles',
    urlPattern: /\/dashboard\/collections\/profiles(?:\/|$)/,
  },
  {
    label: 'Comentarios',
    targetFragment: '/dashboard/collections/comments',
    urlPattern: /\/dashboard\/collections\/comments(?:\/|$)/,
  },
]

async function seedCreatorUser() {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: creatorUser.email,
      },
    },
  })

  const user = await payload.create({
    collection: 'users',
    data: creatorUser,
    draft: false,
    overrideAccess: true,
    showHiddenFields: true,
  })

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      _verified: true,
    },
    overrideAccess: true,
    showHiddenFields: true,
  })

  const profileID = await findCreatorProfileByOwner({
    ownerID: String(user.id),
    payload,
  })

  const existingBiography = await payload.find({
    collection: 'biographies',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      owner: {
        equals: user.id,
      },
    },
  })

  if (existingBiography.docs.length === 0) {
    await payload.create({
      collection: 'biographies',
      data: {
        hero: {
          type: 'mediumImpact',
        },
        layout: [],
        owner: user.id,
        ...(profileID ? { profile: profileID } : {}),
        title: creatorUser.name,
      },
      draft: false,
      overrideAccess: true,
    })
  }
}

async function cleanupCreatorUser() {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: creatorUser.email,
      },
    },
  })
}

async function loginToDashboard(page: Page) {
  await page.goto('http://localhost:3000/dashboard/login')
  await page.fill('#email', creatorUser.email)
  await page.fill('#password', creatorUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard(?:\?.*)?$/)
}

async function openMobileMenu(page: Page) {
  const toggler = page.locator('.app-header__mobile-nav-toggler').first()
  await expect(toggler).toBeVisible()
  await toggler.click()
}

async function clickMenuLink(page: Page, label: string) {
  const link = page
    .locator('.nav-group__content')
    .getByRole('link', { exact: true, name: label })
    .first()
  await expect(link).toBeVisible()
  await link.click()
}

test.describe('Creator mobile dashboard nav repeat', () => {
  test.setTimeout(120000)

  test.use({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  })

  test.beforeAll(async () => {
    await seedCreatorUser()
  })

  test.afterAll(async () => {
    await cleanupCreatorUser()
  })

  test('every visible collection link can be clicked again after reopening the mobile menu', async ({
    page,
  }) => {
    await loginToDashboard(page)

    for (const flow of menuFlows) {
      await openMobileMenu(page)
      await clickMenuLink(page, flow.label)
      await page.waitForURL(flow.urlPattern)

      await openMobileMenu(page)

      const repeatedNavigation = page.waitForRequest(
        (request) =>
          request.isNavigationRequest() && request.url().includes(flow.targetFragment),
      )

      await clickMenuLink(page, flow.label)

      await repeatedNavigation
      await page.waitForURL(flow.urlPattern)
    }
  })
})
