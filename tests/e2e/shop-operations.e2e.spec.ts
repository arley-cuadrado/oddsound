import { test, expect } from '@playwright/test'
import type { Payload } from 'payload'
import { model, idOf } from '../../src/commerce/store'
import { createCheckout, processPayment, verifyDelivery } from '../../src/commerce/service'
import { seedCarriers } from '../../src/commerce/tracking'

let payload: Payload, seller: any, fan: any, artist: string
const password = 'isolated-shop-test-password'
test.beforeAll(async () => {
  const { getPayload } = await import('payload')
  const config = (await import('../../src/payload.config')).default
  payload = await getPayload({ config })
  for (const m of Object.values(payload.db.collections)) await m.createIndexes()
  const suffix = Date.now()
  seller = await payload.create({
    collection: 'users',
    data: {
      _verified: true,
      role: 'creator',
      userType: 'band',
      accountType: 'band',
      name: 'Banda navegador',
      username: `band-${suffix}`,
      email: `band-${suffix}@example.test`,
      password,
    },
  })
  fan = await payload.create({
    collection: 'users',
    data: {
      _verified: true,
      role: 'creator',
      userType: 'fan',
      name: 'Fan navegador',
      username: `fan-${suffix}`,
      email: `fan-${suffix}@example.test`,
      password,
    },
  })
  const profile = await model(payload, 'profiles').findOne({ owner: seller.id }).lean<any>()
  artist = idOf(profile._id)
  await model(payload, 'profiles').updateOne(
    { _id: profile._id },
    {
      $set: {
        'commerce.bankVerified': true,
        'commerce.shippingFlatRateCOP': 0,
        _status: 'published',
      },
    },
  )
  await model(payload, 'commerceBanks').create({
    artist,
    state: 'verified',
    revision: 'e2e',
    encryptedDetails: 'not-used',
  })
  await payload.updateGlobal({
    slug: 'commerceSettings',
    overrideAccess: true,
    data: { chargesEnabled: true, commissionConfirmed: true, commissionPercent: 12 },
  })
  await seedCarriers(payload)
})
test.afterAll(async () => {
  if (payload) await payload.destroy()
})

test('band creates a physical product; buyer tracks, messages, claims and reviews a verified purchase', async ({
  page,
  browser,
}) => {
  test.setTimeout(240000)
  page.setDefaultTimeout(20000)
  const base = 'http://localhost:3000'
  const login = await page.request.post(`${base}/api/users/login`, {
    data: { email: seller.email, password },
  })
  expect(login.ok(), await login.text()).toBe(true)
  console.info('Shop E2E: login verified; opening product form')
  await page.goto(`${base}/dashboard/collections/products/create`)
  await expect(page.getByText('Físico', { exact: true })).toBeVisible()
  await expect(page.getByText('Proveedor de checkout', { exact: true })).not.toBeVisible()
  await expect(page.getByText('URL de compra externa', { exact: true })).not.toBeVisible()
  await page.locator('#field-title').fill('LP de navegador')
  await page.locator('#field-inventory').fill('3')
  await page.locator('#priceInCOP').fill('100000')
  console.info('Shop E2E: product fields filled; publishing')
  await page.getByRole('button', { name: 'Publicar cambios', exact: true }).click()
  await expect(page).toHaveURL(/\/products\/[a-f0-9]{24}$/)
  const product = await model(payload, 'products')
    .findOne({ owner: seller.id, title: 'LP de navegador' })
    .lean<any>()
  expect(product.productType).toBe('physical')
  expect(product.priceInCOP).toBe(100000)
  console.info('Shop E2E: product persisted; creating isolated paid order')
  const result = await createCheckout(payload, {
    cart: { id: idOf(new (model(payload, 'orders').db.base.Types.ObjectId)()) },
    profile: { id: artist },
    group: {
      items: [
        { productID: idOf(product._id), quantity: 1, unitPriceCOP: 100000, title: product.title },
      ],
    },
    contact: {
      name: 'Fan',
      email: fan.email,
      phone: '3000000000',
      addressLine1: 'Calle 1',
      city: 'Bogotá',
      state: 'Bogotá',
    },
  })
  const order = await model(payload, 'orders').findById(result.orderID).lean<any>()
  await model(payload, 'orders').updateOne({ _id: order._id }, { $set: { customer: fan.id } })
  await processPayment(payload, {
    id: `e2e-${result.orderID}`,
    status: 'APPROVED',
    reference: order.finance.reference,
    currency: 'COP',
    amount_in_cents: order.finance.gross,
  })
  console.info('Shop E2E: paid order ready; opening seller hub')
  await page.goto(`${base}/dashboard/collections/products`)
  await expect(page.getByRole('tab', { name: 'Resumen', exact: true })).toBeVisible()
  await expect(page.getByText('Unidades vendidas: 1', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/shop-seller-hub.png', fullPage: true })
  await page.getByRole('tab', { name: 'Pedidos y envíos' }).click()
  await expect(
    page.getByRole('heading', { name: new RegExp(`Pedido ${result.orderID}`) }),
  ).toBeVisible()
  await page.getByText('Registrar guía y unidades', { exact: true }).click()
  await page.getByLabel('Número de guía', { exact: true }).fill('123456789012')
  await page.getByLabel('LP de navegador · unidades en esta guía').fill('1')
  await page.getByRole('button', { name: 'Registrar envío', exact: true }).click()
  await expect(page.getByText(/Guía 123456789012/)).toBeVisible()

  const context = await browser.newContext(),
    buyerPage = await context.newPage()
  try {
    expect(
      (
        await context.request.post(`${base}/api/users/login`, {
          data: { email: fan.email, password },
        })
      ).ok(),
    ).toBe(true)
    console.info('Shop E2E: shipment registered; opening fan account')
    await buyerPage.goto(`${base}/fan/account`)
    await expect(buyerPage.getByRole('heading', { name: 'Mis compras y envíos' })).toBeVisible()
    await expect(buyerPage.getByText(/Guía 123456789012/)).toBeVisible()
    await buyerPage
      .locator('summary')
      .filter({ hasText: /^Conversación del pedido/ })
      .click()
    await buyerPage.getByLabel('Mensaje al participante').fill('¿Cuándo llega mi LP?')
    await buyerPage.getByRole('button', { name: 'Enviar consulta', exact: true }).click()
    await expect(buyerPage.getByText('¿Cuándo llega mi LP?', { exact: true })).toBeVisible()
    expect(await model(payload, 'commerceCases').countDocuments({ order: result.orderID })).toBe(0)
    await page.getByRole('tab', { name: 'Mensajes', exact: true }).click()
    await page
      .locator('summary')
      .filter({ hasText: /^Conversación del pedido/ })
      .click()
    await expect(page.getByText('¿Cuándo llega mi LP?', { exact: true })).toBeVisible()
    await page.getByLabel('Mensaje al participante').fill('Está en camino con tu guía.')
    await page.getByRole('button', { name: 'Enviar consulta', exact: true }).click()
    await buyerPage.reload()
    await buyerPage
      .locator('summary')
      .filter({ hasText: /^Conversación del pedido/ })
      .click()
    await expect(buyerPage.getByText('Está en camino con tu guía.', { exact: true })).toBeVisible()
    await buyerPage.screenshot({ path: 'test-results/shop-fan-orders.png', fullPage: true })
    await buyerPage.getByText('Abrir un reclamo formal', { exact: true }).click()
    await buyerPage.getByLabel('Importe reclamado (COP)').fill('1000')
    await buyerPage
      .getByLabel('Describe el problema y los productos afectados')
      .fill('Necesito revisión del pedido.')
    await buyerPage.getByRole('button', { name: 'Abrir reclamo', exact: true }).click()
    await expect(buyerPage.getByText(/Reclamo · Esperando al vendedor/)).toBeVisible()
    const shipment = await model(payload, 'commerceShipments')
      .findOne({ order: result.orderID })
      .lean<any>()
    await verifyDelivery(
      payload,
      'e2e-admin',
      idOf(shipment._id),
      new Date().toISOString(),
      'Prueba de entrega independiente',
    )
    const profile = await model(payload, 'profiles').findById(artist).lean<any>()
    await buyerPage.goto(`${base}/${profile.slug}/shop/${product.slug}`)
    await buyerPage.getByLabel('Calificación del vendedor').selectOption('5')
    await buyerPage
      .getByLabel('Comentario sobre el servicio')
      .fill('La banda respondió y entregó mi LP.')
    await buyerPage.getByRole('button', { name: 'Guardar reseña' }).click()
    await expect(
      buyerPage
        .getByRole('article')
        .getByText('La banda respondió y entregó mi LP.', { exact: true }),
    ).toBeVisible()
    await buyerPage.screenshot({ path: 'test-results/shop-product-review.png', fullPage: true })
    await buyerPage.goto(`${base}/${profile.slug}/shop`)
    await expect(buyerPage.getByText('★ 5.0 de 5 · 1 reseña')).toBeVisible()
    await buyerPage.screenshot({ path: 'test-results/shop-rating.png', fullPage: true })
  } finally {
    await context.close()
  }
})
