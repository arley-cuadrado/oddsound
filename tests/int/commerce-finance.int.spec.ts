// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import type { Payload } from 'payload'
import { mergeListSearchAndWhere } from 'payload/shared'
import { registerDateWhere } from '@/commerce/registerFilters'
import { model, idOf, balance, account } from '@/commerce/store'
import {
  createCheckout,
  processPayment,
  reconcileOrder,
  addShipment,
  verifyDelivery,
  openCase,
  decideCase,
  completeRefund,
  preparePayouts,
  releaseAvailable,
  settlePayout,
} from '@/commerce/service'
import { seedCarriers } from '@/commerce/tracking'
import { publicReviews, saveReview, sendOrderMessage, verifiedReviewOrder } from '@/commerce/social'
import { commerceSummary } from '@/commerce/summary'

let replica: MongoMemoryReplSet, payload: Payload, artist: string, product: string, cart: string
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '7.0.24' },
  })
  process.env.DATABASE_URL = replica.getUri('oddsound-commerce-test')
  process.env.PAYLOAD_SECRET = 'isolated-commerce-test-secret'
  process.env.WOMPI_PUBLIC_KEY = 'pub_test_example'
  process.env.WOMPI_INTEGRITY_SECRET = 'test'
  const { getPayload } = await import('payload')
  const config = (await import('@/payload.config')).default
  payload = await getPayload({ config })
  for (const m of Object.values(payload.db.collections)) await m.createIndexes()
}, 180000)
afterAll(async () => {
  if (payload) await payload.destroy()
  if (replica) await replica.stop()
})
beforeEach(async () => {
  for (const name of [
    'orders',
    'products',
    'profiles',
    'transactions',
    'commerceJournal',
    'commerceBanks',
    'commercePayouts',
    'commerceCases',
    'commerceShipments',
    'commerceIncidents',
    'commerceTasks',
    'commerceRefunds',
    'commerceReviews',
    'commerceReviewReports',
    'commerceMessages',
    'commerceConversations',
    'commerceAttachments',
  ])
    await model(payload, name).deleteMany({})
  const profile = await model(payload, 'profiles').create({
    displayName: 'Test band',
    slug: 'test-band',
    commerce: { bankVerified: true, shippingFlatRateCOP: 0 },
  })
  artist = idOf(profile._id)
  const p = await model(payload, 'products').create({
    title: 'LP',
    profile: artist,
    productType: 'physical',
    requiresShipping: true,
    priceInCOP: 100000,
    inventory: 4,
    _status: 'published',
  })
  product = idOf(p._id)
  cart = idOf(new (model(payload, 'orders').db.base.Types.ObjectId)())
  await model(payload, 'commerceBanks').create({
    artist,
    state: 'verified',
    revision: 'bank-1',
    encryptedDetails: 'unused-in-this-test',
  })
  await payload.updateGlobal({
    slug: 'commerceSettings',
    data: {
      chargesEnabled: true,
      commissionConfirmed: true,
      commissionPercent: 12,
      payoutsEnabled: true,
      reconciliationBlocked: false,
      payoutWeekday: '3',
      payoutHour: 9,
      ownRefundFundsInCents: 100000000,
      ownPayoutFundsInCents: 100000000,
      payoutFeeReserveInCents: 100000,
      observedAvailableInCents: 100000000,
      balanceObservedAt: new Date().toISOString(),
      balanceEvidence: 'test statement',
    },
    overrideAccess: true,
  })
  await seedCarriers(payload)
})

describe('Shop Register server pagination', () => {
  it('combines native text search, calendar bounds and stable pages of 15 records', async () => {
    const attachments = model(payload, 'commerceAttachments')
    const day = new Date('2026-10-29T05:00:00.000Z')
    await attachments.collection.insertMany([
      ...Array.from({ length: 20 }, (_, i) => ({
        name: `Factura demo ${i}`,
        createdAt: day,
        updatedAt: day,
      })),
      { name: 'Factura anterior', createdAt: new Date(day.getTime() - 1), updatedAt: day },
      {
        name: 'Factura siguiente',
        createdAt: new Date('2026-10-30T05:00:00.000Z'),
        updatedAt: day,
      },
      { name: 'Otro archivo', createdAt: day, updatedAt: day },
    ])
    const config = payload.collections.commerceAttachments.config
    const where = mergeListSearchAndWhere({
      collectionConfig: config,
      search: 'Factura',
      where:
        registerDateWhere({ field: 'createdAt', period: 'day', value: '2026-10-29', end: '' }) ||
        {},
    })
    const user = { id: artist, role: 'admin', collection: 'users' as const }
    const options = {
      collection: 'commerceAttachments' as const,
      where,
      limit: config.admin.pagination!.defaultLimit,
      depth: 0,
      overrideAccess: false,
      user,
    }
    const first = await payload.find({ ...options, page: 1 })
    const second = await payload.find({ ...options, page: 2 })
    expect(first.totalDocs).toBe(20)
    expect(first.totalPages).toBe(2)
    expect(first.docs).toHaveLength(15)
    expect(second.docs).toHaveLength(5)
    expect(new Set([...first.docs, ...second.docs].map((d) => d.id)).size).toBe(20)
    expect(first.docs.every((d) => d.name?.startsWith('Factura demo'))).toBe(true)
    const repeated = await payload.find({ ...options, page: 1 })
    expect(repeated.docs.map((d) => d.id)).toEqual(first.docs.map((d) => d.id))
  })
})

describe('storefront reviews and private conversations', () => {
  async function buyerOrder() {
    const result = await paid()
    const buyer = idOf(new (model(payload, 'orders').db.base.Types.ObjectId)())
    await model(payload, 'orders').updateOne({ _id: result.orderID }, { $set: { customer: buyer } })
    return { ...result, buyer }
  }
  it('requires a verified delivery and own purchase before reviewing', async () => {
    const r = await buyerOrder()
    await expect(verifiedReviewOrder(payload, r.buyer, r.orderID, product)).rejects.toThrow(
      /verificada/,
    )
    await deliver(r.orderID)
    await expect(verifiedReviewOrder(payload, 'another-buyer', r.orderID, product)).rejects.toThrow(
      /propia/,
    )
    await expect(verifiedReviewOrder(payload, r.buyer, r.orderID, artist)).rejects.toThrow(/propia/)
    await expect(
      saveReview(
        payload,
        { id: r.buyer },
        { orderID: r.orderID, product, stars: 6, body: 'Invalid' },
      ),
    ).rejects.toThrow(/estrellas/)
    await saveReview(
      payload,
      { id: r.buyer, name: 'Fan público' },
      { orderID: r.orderID, product, stars: 4, body: 'Buen servicio' },
    )
    const result = await publicReviews(payload, artist, product)
    expect(result.rating).toEqual({ average: 4, count: 1 })
    expect(result.reviews[0]).toMatchObject({ publicName: 'Fan público', body: 'Buen servicio' })
    expect(result.reviews[0]).not.toHaveProperty('buyer')
    expect(result.reviews[0]).not.toHaveProperty('order')
  })
  it('serializes concurrent review saves, retains history and preserves moderation on edit', async () => {
    const r = await buyerOrder()
    await deliver(r.orderID)
    await Promise.all(
      [4, 5].map((stars) =>
        saveReview(
          payload,
          { id: r.buyer },
          { orderID: r.orderID, product, stars, body: 'Servicio verificado' },
        ),
      ),
    )
    expect(await model(payload, 'commerceReviews').countDocuments()).toBe(1)
    const review = await model(payload, 'commerceReviews').findOne().lean<any>()
    expect(review.history).toHaveLength(1)
    await expect(
      model(payload, 'commerceReviews').create({
        buyer: r.buyer,
        order: r.orderID,
        product,
        artist,
        stars: 5,
      }),
    ).rejects.toMatchObject({ code: 11000 })
    await model(payload, 'commerceReviews').updateOne(
      { _id: review._id },
      { $set: { hidden: true } },
    )
    await saveReview(
      payload,
      { id: r.buyer },
      { orderID: r.orderID, product, stars: 1, body: 'Edición' },
    )
    expect((await publicReviews(payload, artist)).rating.count).toBe(0)
    expect(
      (await model(payload, 'profiles').findById(artist).lean<any>()).commerce.salesBlocked,
    ).not.toBe(true)
  })
  it('keeps reviews unavailable until all units of the product are delivered and verified', async () => {
    const r = await checkout(2)
    const order = await model(payload, 'orders').findById(r.orderID).lean<any>()
    const buyer = idOf(new (model(payload, 'orders').db.base.Types.ObjectId)())
    await model(payload, 'orders').updateOne({ _id: order._id }, { $set: { customer: buyer } })
    await processPayment(payload, {
      id: `partial-${r.orderID}`,
      status: 'APPROVED',
      reference: order.finance.reference,
      currency: 'COP',
      amount_in_cents: 20000000,
    })
    const one = await addShipment(payload, 'seller', r.orderID, 'coordinadora', '11111111', [
      { product, quantity: 1 },
    ])
    await verifyDelivery(
      payload,
      'admin',
      idOf(one._id),
      new Date().toISOString(),
      'First parcel evidence',
    )
    await expect(verifiedReviewOrder(payload, buyer, r.orderID, product)).rejects.toThrow(
      /verificada/,
    )
    await expect(
      addShipment(payload, 'seller', r.orderID, 'coordinadora', '22222222', [
        { product, quantity: 2 },
      ]),
    ).rejects.toThrow()
    const two = await addShipment(payload, 'seller', r.orderID, 'coordinadora', '33333333', [
      { product, quantity: 1 },
    ])
    await verifyDelivery(
      payload,
      'admin',
      idOf(two._id),
      new Date().toISOString(),
      'Second parcel evidence',
    )
    await expect(verifiedReviewOrder(payload, buyer, r.orderID, product)).resolves.toBeDefined()
  })
  it('restricts reports and audited review moderation to authenticated users and admins', async () => {
    const r = await buyerOrder()
    await deliver(r.orderID)
    await saveReview(
      payload,
      { id: r.buyer },
      { orderID: r.orderID, product, stars: 2, body: 'Opinión verificable' },
    )
    const review = await model(payload, 'commerceReviews').findOne().lean<any>()
    const { handleCommerce } = await import('@/commerce/http')
    const auth = vi
      .spyOn(payload, 'auth')
      .mockResolvedValue({ user: { id: r.buyer, role: 'creator', userType: 'fan' } } as any)
    const post = (values: unknown) =>
      handleCommerce(
        new Request('http://localhost:3000/creator-api/commerce/operations', {
          method: 'POST',
          body: JSON.stringify(values),
        }),
      )
    try {
      expect(
        (
          await post({
            action: 'reportReview',
            review: idOf(review._id),
            reason: 'Revisar contenido',
          })
        ).status,
      ).toBe(200)
      expect(
        (
          await post({
            action: 'moderateReview',
            review: idOf(review._id),
            hidden: true,
            reason: 'Motivo',
          })
        ).status,
      ).toBe(403)
      auth.mockResolvedValue({ user: { id: 'admin', role: 'admin' } } as any)
      expect(
        (
          await post({
            action: 'moderateReview',
            review: idOf(review._id),
            hidden: true,
            reason: 'Incumple reglas de publicación',
          })
        ).status,
      ).toBe(200)
      expect((await publicReviews(payload, artist)).rating.count).toBe(0)
      expect(
        (
          await post({
            action: 'moderateReview',
            review: idOf(review._id),
            hidden: false,
            reason: 'Revisión administrativa',
          })
        ).status,
      ).toBe(200)
      expect((await publicReviews(payload, artist)).rating.count).toBe(1)
      expect(
        await model(payload, 'commerceAudits').countDocuments({
          action: 'review_moderated',
          'details.review': idOf(review._id),
        }),
      ).toBe(2)
    } finally {
      auth.mockRestore()
    }
  })
  it('messages preserve balances, validate products and cannot be read by outsiders', async () => {
    const r = await buyerOrder()
    const order = await model(payload, 'orders').findById(r.orderID).lean<any>()
    const initial = await balance(payload, account(artist, r.orderID, 'pending'))
    await sendOrderMessage(payload, r.buyer, order, 'buyer', '¿Cuándo despachan?', product)
    await sendOrderMessage(payload, 'seller', order, 'seller', 'Mañana')
    expect(await model(payload, 'commerceMessages').countDocuments()).toBe(2)
    expect(await model(payload, 'commerceCases').countDocuments()).toBe(0)
    expect(await balance(payload, account(artist, r.orderID, 'pending'))).toBe(initial)
    await expect(
      sendOrderMessage(payload, r.buyer, order, 'buyer', 'Consulta', artist),
    ).rejects.toThrow(/ajeno/)
    const { handleCommerce } = await import('@/commerce/http')
    const auth = vi
      .spyOn(payload, 'auth')
      .mockResolvedValue({ user: { id: 'outsider', role: 'creator', userType: 'fan' } } as any)
    try {
      const response = await handleCommerce(
        new Request(
          `http://localhost:3000/creator-api/commerce/operations?action=conversation&orderID=${r.orderID}`,
        ),
      )
      expect(response.status).toBe(403)
      auth.mockResolvedValue({ user: { id: r.buyer, role: 'creator', userType: 'fan' } } as any)
      const read = await handleCommerce(
        new Request(
          `http://localhost:3000/creator-api/commerce/operations?action=conversation&orderID=${r.orderID}`,
        ),
      )
      const data = await read.json()
      expect(data.unread).toBe(1)
      const marked = await handleCommerce(
        new Request('http://localhost:3000/creator-api/commerce/operations', {
          method: 'POST',
          body: JSON.stringify({
            action: 'readConversation',
            orderID: r.orderID,
            cursor: data.cursor,
          }),
        }),
      )
      expect(marked.status).toBe(200)
      const after = await handleCommerce(
        new Request(
          `http://localhost:3000/creator-api/commerce/operations?action=conversation&orderID=${r.orderID}`,
        ),
      )
      expect((await after.json()).unread).toBe(0)
      const unsafe = await handleCommerce(
        new Request(
          `http://localhost:3000/creator-api/commerce/operations?action=sendMessage&orderID=${r.orderID}`,
        ),
      )
      expect(unsafe.status).toBe(405)
    } finally {
      auth.mockRestore()
    }
  })
  it('aggregates all paid orders rather than the first page and reconciles ledger totals', async () => {
    const r = await paid()
    await reconcileOrder(payload, 'admin', r.orderID, 300000, 'real cost')
    const original = await model(payload, 'orders').findById(r.orderID).lean<any>()
    for (let n = 0; n < 25; n++)
      await model(payload, 'orders').create({
        artistProfile: artist,
        paymentProvider: 'wompi',
        finance: {
          ...original.finance,
          reference: `summary-${n}`,
          processorCost: null,
          reconciledAt: null,
        },
      })
    const result = await commerceSummary(payload, { artistProfile: artist })
    expect(result.units).toBe(26)
    expect(result.sales).toBe(260000000)
    expect(result.unreconciled).toBe(25)
    expect(result.buckets.pending).toBe(8500000)
    expect(result.commission).toBe(1200000)
    expect(result.processorCost).toBe(300000)
    expect((await commerceSummary(payload, { customerEmail: 'other@example.test' })).units).toBe(0)
  })
  it('protects technical product fields and physical shipping rules through Payload access', async () => {
    const id = idOf(new (model(payload, 'orders').db.base.Types.ObjectId)())
    const user = {
      id,
      email: 'seller@example.test',
      role: 'creator',
      userType: 'band',
      profile: artist,
      collection: 'users',
    } as any
    const saved = await payload.create({
      collection: 'products',
      user,
      overrideAccess: false,
      draft: true,
      data: {
        title: 'Camiseta',
        slug: `shirt-${id}`,
        inventory: 3,
        priceInCOP: 45000,
        checkoutProvider: 'other',
        externalCheckoutURL: 'https://example.test/secret',
        externalProductReference: 'private',
      },
    })
    expect(saved.productType).toBe('physical')
    expect(saved.requiresShipping).toBe(true)
    expect(saved.priceInCOPEnabled).toBe(true)
    expect(saved.priceInCOP).toBe(45000)
    expect(saved.checkoutProvider).toBeUndefined()
    expect(saved.externalCheckoutURL).toBeUndefined()
    const stored = await model(payload, 'products').findById(saved.id).lean<any>()
    expect(stored.checkoutProvider).toBe('wompi')
    expect(stored.externalProductReference).toBeUndefined()
    await expect(
      payload.update({
        collection: 'products',
        id: saved.id,
        user,
        overrideAccess: false,
        data: { productType: 'digital' },
      }),
    ).rejects.toThrow(/físicos/)
    await expect(
      payload.update({
        collection: 'products',
        id: saved.id,
        user,
        overrideAccess: false,
        data: { requiresShipping: false },
      }),
    ).rejects.toThrow(/requieren envío/)
    await expect(
      payload.find({ collection: 'commerceMessages', user, overrideAccess: false }),
    ).rejects.toThrow()
  })
})
async function checkout(quantity = 1) {
  return createCheckout(payload, {
    cart: { id: cart },
    profile: { id: artist },
    group: { items: [{ productID: product, quantity, unitPriceCOP: 100000, title: 'LP' }] },
    contact: {
      name: 'Buyer',
      email: 'buyer@example.com',
      phone: '3000000000',
      addressLine1: 'Calle 1',
      city: 'Bogotá',
      state: 'Bogotá',
    },
  })
}
async function paid() {
  const r = await checkout()
  const order = await model(payload, 'orders').findById(r.orderID).lean<any>()
  const tx = {
    id: `tx-${r.orderID}`,
    status: 'APPROVED',
    reference: order.finance.reference,
    currency: 'COP',
    amount_in_cents: 10000000,
  }
  await processPayment(payload, tx)
  return { ...r, tx }
}
async function deliver(orderID: string, guide = `12345${Date.now()}`) {
  const s = await addShipment(payload, 'seller', orderID, 'coordinadora', guide, [
    { product, quantity: 1 },
  ])
  await model(payload, 'orders').updateOne(
    { _id: orderID },
    { $set: { 'finance.paidAt': new Date(Date.now() - 10 * 86400000).toISOString() } },
  )
  await verifyDelivery(
    payload,
    'admin',
    idOf(s._id),
    new Date(Date.now() - 8 * 86400000).toISOString(),
    'Proof and matching recipient',
  )
}

describe('real MongoDB commerce transactions', () => {
  it('reuses checkout, reserves once, and requires shipping even with free freight', async () => {
    const a = await checkout(),
      b = await checkout()
    expect(b.orderID).toBe(a.orderID)
    expect((await model(payload, 'products').findById(product).lean<any>()).inventory).toBe(3)
    const order = await model(payload, 'orders').findById(a.orderID).lean<any>()
    expect(order.fulfillmentStatus).toBe('pending_payment')
    expect(order.finance.gross).toBe(10000000)
    expect(order.shippingAddress.addressLine1).toBe('Calle 1')
  })
  it('handles concurrent approvals exactly once and balances every journal', async () => {
    const r = await paid()
    await Promise.all([processPayment(payload, r.tx), processPayment(payload, r.tx)])
    expect(await model(payload, 'commerceJournal').countDocuments({ kind: 'payment' })).toBe(1)
    expect(await balance(payload, account(artist, r.orderID, 'pending'))).toBe(8800000)
    const entries = await model(payload, 'commerceJournal').find().lean<any[]>()
    for (const entry of entries)
      expect(entry.postings.reduce((n: number, p: any) => n + p.amount, 0)).toBe(0)
  })
  it('does not oversell concurrent checkouts', async () => {
    await model(payload, 'products').updateOne({ _id: product }, { $set: { inventory: 1 } })
    const results = await Promise.allSettled([checkout(1), checkout(2)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect((await model(payload, 'products').findById(product).lean<any>()).inventory).toBe(0)
  })
  it('reconciles processor cost once and blocks release without verified delivery', async () => {
    const r = await paid()
    await reconcileOrder(payload, 'admin', r.orderID, 300000, 'statement')
    await expect(reconcileOrder(payload, 'admin', r.orderID, 300000, 'statement')).rejects.toThrow()
    await releaseAvailable(payload)
    expect(await balance(payload, account(artist, r.orderID, 'available'))).toBe(0)
    await deliver(r.orderID)
    await releaseAvailable(payload)
    expect(await balance(payload, account(artist, r.orderID, 'available'))).toBe(8500000)
  })
  it('holds a disputed order during weekly cutoff and refunds only once', async () => {
    const r = await paid()
    await reconcileOrder(payload, 'admin', r.orderID, 300000, 'statement')
    await deliver(r.orderID)
    await releaseAvailable(payload)
    const c = await openCase(payload, 'buyer', r.orderID, 'Wrong item', 10000000, [
      { product, quantity: 1 },
    ])
    expect(await balance(payload, account(artist, r.orderID, 'available'))).toBe(0)
    expect(await balance(payload, account(artist, r.orderID, 'held'))).toBe(8500000)
    await decideCase(payload, 'admin', idOf(c._id), {
      refund: 10000000,
      sellerFault: true,
      decision: 'Confirmed failure',
    })
    await completeRefund(payload, 'admin', `refund-${idOf(c._id)}`, 'bank refund receipt')
    await completeRefund(payload, 'admin', `refund-${idOf(c._id)}`, 'bank refund receipt')
    expect(await balance(payload, 'buyers:refunded')).toBe(10000000)
    expect(await balance(payload, `artist:${artist}:debt`)).toBe(-300000)
    expect(await model(payload, 'commerceIncidents').countDocuments()).toBe(1)
  })
  it('reserves a weekly payout once despite overlapping workers and settles per recipient', async () => {
    const r = await paid()
    await reconcileOrder(payload, 'admin', r.orderID, 300000, 'statement')
    await deliver(r.orderID)
    await releaseAvailable(payload)
    const now = new Date()
    const bogotaDay = new Date(now.getTime() - 5 * 3600000).getUTCDay()
    const hour = new Date(now.getTime() - 5 * 3600000).getUTCHours()
    await payload.updateGlobal({
      slug: 'commerceSettings',
      data: { payoutWeekday: String(bogotaDay) as any, payoutHour: hour },
      overrideAccess: true,
    })
    await Promise.all([preparePayouts(payload, now), preparePayouts(payload, now)])
    const payouts = await model(payload, 'commercePayouts').find().lean<any[]>()
    expect(payouts).toHaveLength(1)
    expect(await balance(payload, account(artist, r.orderID, 'in_transit'))).toBe(8500000)
    await settlePayout(payload, payouts[0].reference, 'APPROVED', 'provider transaction')
    await settlePayout(payload, payouts[0].reference, 'APPROVED', 'provider transaction retry')
    expect(await balance(payload, account(artist, r.orderID, 'paid'))).toBe(8500000)
  })
  it('denies direct ledger modification even to an admin and public reads', async () => {
    await expect(
      payload.create({
        collection: 'commerceJournal',
        data: { reference: 'fake', kind: 'fake' },
        overrideAccess: false,
        user: { id: 'admin', role: 'admin' } as any,
      }),
    ).rejects.toThrow()
    await expect(
      payload.find({ collection: 'commerceBanks', overrideAccess: false }),
    ).rejects.toThrow()
  })
})

it('refunds after payout from own funds and records the debt without touching another artist', async () => {
  const r = await paid()
  await reconcileOrder(payload, 'admin', r.orderID, 300000, 'statement')
  await deliver(r.orderID)
  await releaseAvailable(payload)
  const { journal, atomic } = await import('@/commerce/store')
  const { transfer } = await import('@/commerce/domain')
  await atomic(payload, 'commerce-financial', async (session) => {
    await journal(payload, session, {
      reference: 'simulated-completed-payout',
      artist,
      order: r.orderID,
      kind: 'payout_paid',
      postings: transfer(
        account(artist, r.orderID, 'available'),
        account(artist, r.orderID, 'paid'),
        8500000,
      ),
    })
    await journal(payload, session, {
      reference: 'other-artist',
      kind: 'payment',
      postings: transfer('wompi:unsettled', 'artist:other:order:other:pending', 7000000),
    })
  })
  const c = await openCase(payload, 'buyer', r.orderID, 'Never received', 10000000, [
    { product, quantity: 1 },
  ])
  await decideCase(payload, 'admin', idOf(c._id), {
    refund: 10000000,
    sellerFault: true,
    decision: 'Validated',
  })
  await completeRefund(payload, 'admin', `refund-${idOf(c._id)}`, 'Own treasury refund')
  expect(await balance(payload, `artist:${artist}:debt`)).toBe(-8800000)
  expect(await balance(payload, 'artist:other:order:other:pending')).toBe(7000000)
})

it('blocks new sales at the third confirmed order-level incident', async () => {
  for (let n = 0; n < 3; n++) {
    const r = await paid()
    const c = await openCase(payload, 'buyer', r.orderID, 'Confirmed failure', 10000000, [
      { product, quantity: 1 },
    ])
    await decideCase(payload, 'admin', idOf(c._id), {
      refund: 0,
      sellerFault: true,
      decision: 'Independent evidence confirmed fault',
    })
  }
  expect(
    (await model(payload, 'profiles').findById(artist).lean<any>()).commerce.salesBlocked,
  ).toBe(true)
  await expect(checkout()).rejects.toThrow(/verificar|habilitada/)
  expect(await model(payload, 'commerceIncidents').countDocuments()).toBe(3)
})

it('rejects another buyer and a seller trying to verify their own delivery', async () => {
  const r = await paid()
  const { handleCommerce } = await import('@/commerce/http')
  const auth = vi.spyOn(payload, 'auth')
  auth.mockResolvedValue({ user: { id: 'unrelated-buyer', role: 'fan' } } as any)
  const response = await handleCommerce(
    new Request(`http://localhost:3000/creator-api/commerce/operations?orderID=${r.orderID}`),
  )
  expect(response.status).toBe(403)
  auth.mockResolvedValue({ user: { id: 'seller', role: 'creator', profile: artist } } as any)
  const rejected = await handleCommerce(
    new Request('http://localhost:3000/creator-api/commerce/operations', {
      method: 'POST',
      body: JSON.stringify({
        action: 'shipment',
        orderID: r.orderID,
        fulfillmentStatus: 'delivered',
      }),
    }),
  )
  expect(rejected.status).toBe(403)
  auth.mockRestore()
})

it('records a bank reversal without issuing another refund and rejects overlapping refunds', async () => {
  const { recordChargeback } = await import('@/commerce/service')
  const r = await paid()
  await reconcileOrder(payload, 'admin', r.orderID, 300000, 'statement')
  await recordChargeback(
    payload,
    'admin',
    r.orderID,
    5000000,
    'bank-dispute-1',
    'bank statement confirmed debit',
  )
  expect(await balance(payload, 'buyers:refunded')).toBe(5000000)
  expect(await model(payload, 'commerceJournal').countDocuments({ kind: 'chargeback' })).toBe(1)
  const c = await openCase(payload, 'buyer', r.orderID, 'Remaining units', 5000000, [
    { product, quantity: 1 },
  ])
  await decideCase(payload, 'admin', idOf(c._id), {
    refund: 5000000,
    sellerFault: false,
    decision: 'Mediation refund',
  })
  await expect(
    recordChargeback(payload, 'admin', r.orderID, 5000000, 'bank-dispute-2', 'overlapping report'),
  ).rejects.toThrow(/reembolso en curso/)
  expect(await model(payload, 'commerceJournal').countDocuments({ kind: 'chargeback' })).toBe(1)
})

it('does not resubmit a payout after an ambiguous provider timeout', async () => {
  const r = await paid()
  await reconcileOrder(payload, 'admin', r.orderID, 300000, 'statement')
  await deliver(r.orderID)
  await releaseAvailable(payload)
  const { encryptSecret } = await import('@/utilities/secrets')
  await model(payload, 'commerceBanks').updateOne(
    { artist },
    {
      $set: {
        encryptedDetails: encryptSecret(
          JSON.stringify({
            name: 'Artist',
            legalIdType: 'CC',
            legalId: '123456',
            bankId: 'bank',
            accountType: 'AHORROS',
            accountNumber: '123456789',
            email: 'artist@example.com',
          }),
        ),
      },
    },
  )
  const now = new Date(),
    local = new Date(now.getTime() - 5 * 3600000)
  await payload.updateGlobal({
    slug: 'commerceSettings',
    data: { payoutWeekday: String(local.getUTCDay()) as any, payoutHour: local.getUTCHours() },
    overrideAccess: true,
  })
  await preparePayouts(payload, now)
  const p = await model(payload, 'commercePayouts').findOne().lean<any>()
  expect(p.feeReserve).toBe(100000)
  expect(await balance(payload, 'wompi:payout-reserved')).toBe(8600000)
  process.env.WOMPI_PAYOUTS_BASE_URL = 'https://api.payouts.wompi.co/v1'
  process.env.WOMPI_PAYOUTS_API_KEY = 'test-only'
  process.env.WOMPI_PAYOUTS_PRINCIPAL_ID = 'test-only'
  process.env.WOMPI_PAYOUTS_ACCOUNT_ID = 'test-only'
  process.env.WOMPI_PAYOUTS_PAYMENT_TYPE = 'PROVIDERS'
  const fetcher = vi.fn().mockRejectedValue(new Error('timeout after submission'))
  vi.stubGlobal('fetch', fetcher)
  try {
    const { runTask } = await import('@/commerce/worker')
    await expect(
      runTask(payload, { kind: 'payout', data: { reference: p.reference } }),
    ).rejects.toThrow('timeout')
    await runTask(payload, { kind: 'payout', data: { reference: p.reference } })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect((await model(payload, 'commercePayouts').findById(p._id).lean<any>()).state).toBe(
      'unknown',
    )
    expect(await balance(payload, account(artist, r.orderID, 'in_transit'))).toBe(8500000)
  } finally {
    vi.unstubAllGlobals()
  }
})
