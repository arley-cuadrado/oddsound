import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { randomUUID } from 'node:crypto'
import { assertPreviewDatabase, isPreviewEnvironment } from '@/config/preview'
import { model, idOf, atomic, insert, journal, account } from '@/commerce/store'
import { transfer } from '@/commerce/domain'
import { encryptSecret } from '@/utilities/secrets'
import { findCreatorProfileByOwner } from '@/utilities/creatorProfiles'
import { upsert } from './upsert'
import { richText } from './richText'

const context = { disableRevalidate: true }
const names = ['Horizonte Demo', 'Luna Demo']
const slugs = ['horizonte-demo', 'luna-demo']

/** Synthetic data only. No exports from production, provider calls, or externally runnable tasks. */
export async function seedPreview(payload: Payload, password: string) {
  assertPreviewDatabase()
  if (!isPreviewEnvironment() || password.length < 20)
    throw new Error('Seed exclusivo de Preview con credencial de prueba segura.')
  const users: User[] = []
  const definitions = [
    {
      email: 'admin@preview.oddsound.test',
      username: 'preview-admin',
      name: 'Administración Demo',
      role: 'admin',
      userType: 'artist',
      accountType: 'artist',
    },
    {
      email: 'banda@preview.oddsound.test',
      username: slugs[0],
      name: names[0],
      role: 'creator',
      userType: 'band',
      accountType: 'band',
    },
    {
      email: 'artista@preview.oddsound.test',
      username: slugs[1],
      name: names[1],
      role: 'creator',
      userType: 'artist',
      accountType: 'artist',
    },
    {
      email: 'fan@preview.oddsound.test',
      username: 'fan-demo',
      name: 'Fan Demo',
      role: 'creator',
      userType: 'fan',
    },
  ]
  for (const data of definitions) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: data.email } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    users.push(
      existing.docs[0] ||
        (await payload.create({
          collection: 'users',
          disableVerificationEmail: true,
          overrideAccess: true,
          context: { ...context, allowAdminPromotion: true },
          data: { ...data, _verified: true, password } as never,
        })),
    )
  }
  const profiles: string[] = [],
    products: string[] = []
  for (let i = 0; i < 2; i++) {
    const user = users[i + 1]
    const profileID = await findCreatorProfileByOwner({ ownerID: user.id, payload })
    if (!profileID) throw new Error('No se pudo crear el perfil de pruebas.')
    profiles.push(profileID)
    await payload.update({
      collection: 'profiles',
      id: profileID,
      overrideAccess: true,
      context,
      data: {
        displayName: names[i],
        slug: slugs[i],
        genre: 'Rock',
        location: 'Colombia',
        bio: 'Perfil ficticio para probar Oddsound. No vende productos reales.',
        commerce: { shippingFlatRateCOP: 0, bankVerified: false, salesBlocked: false },
      },
    })
    const media = await model(payload, 'media')
      .findOneAndUpdate(
        { filename: `preview-demo-${slugs[i]}.webp` },
        {
          $setOnInsert: {
            filename: `preview-demo-${slugs[i]}.webp`,
            mimeType: 'image/webp',
            width: 900,
            height: 1200,
            owner: user.id,
            profile: profileID,
            alt: `${names[i]} — ilustración de prueba`,
            url: `/preview-demo/preview-demo-${slugs[i]}.webp`,
          },
        },
        { upsert: true, new: true },
      )
      .lean<any>()
    const release = await upsert({
      collection: 'pages',
      payload,
      where: { slug: { equals: `${slugs[i]}-album-demo` } },
      data: {
        title: `Primer álbum — ${names[i]}`,
        slug: `${slugs[i]}-album-demo`,
        _status: 'published',
        owner: user.id,
        profile: profileID,
        hero: { type: 'mediumImpact', media: idOf(media._id) },
        layout: [
          {
            blockType: 'content',
            columns: [
              {
                size: 'full',
                enableLink: false,
                richText: richText(
                  'Lanzamiento ficticio. Datos e imágenes creados exclusivamente para Preview.',
                ),
              },
            ],
          },
        ],
        publishedAt: new Date().toISOString(),
      },
    })
    for (const [kind, price] of [
      ['vinilo', 95000],
      ['camiseta', 60000],
    ] as const) {
      const product = await upsert({
        collection: 'products',
        payload,
        where: { slug: { equals: `${slugs[i]}-${kind}-demo` } },
        data: {
          title: `${kind === 'vinilo' ? 'Vinilo' : 'Camiseta'} — ${names[i]} (Demo)`,
          slug: `${slugs[i]}-${kind}-demo`,
          description: 'Producto ficticio para pruebas; no se realizan compras ni envíos reales.',
          owner: user.id,
          profile: profileID,
          productType: 'physical',
          requiresShipping: true,
          priceInCOPEnabled: true,
          priceInCOP: price,
          inventory: 20,
          checkoutProvider: 'wompi',
          coverImage: idOf(media._id),
          release: release.id,
          _status: 'published',
        },
      })
      products.push(String(product.id))
    }
  }
  // Do not activate sandbox checkout or any real external money movement as a side effect of seeding.
  await payload.updateGlobal({
    slug: 'commerceSettings',
    overrideAccess: true,
    data: {
      chargesEnabled: false,
      payoutsEnabled: false,
      productionApproved: false,
      automaticPayoutsApproved: false,
      refundsEnabled: false,
      reconciliationBlocked: true,
      commissionConfirmed: false,
      payoutWeekday: '3',
      payoutHour: 9,
    },
  })
  const states = ['pending', 'available', 'held', 'paid'] as const
  for (let i = 0; i < states.length; i++) {
    const reference = `preview-demo-order-${i}`
    const existing = await model(payload, 'orders')
      .findOne({ 'finance.reference': reference })
      .lean<any>()
    if (existing) continue
    const artist = profiles[i % 2],
      product = products[(i % 2) * 2]
    const productDocument = await model(payload, 'products')
      .findById(product)
      .select('_id')
      .lean<any>()
    const title = `Vinilo — ${names[i % 2]} (Demo)`
    const gross = 9500000,
      commission = 1140000,
      cost = 250000
    const paidAt = new Date(Date.now() - 12 * 86400000).toISOString()
    const deliveredAt = new Date(Date.now() - 9 * 86400000).toISOString()
    await atomic(payload, `seed:${reference}`, async (session) => {
      if (
        await model(payload, 'orders').exists({ 'finance.reference': reference }).session(session)
      )
        return
      const order = await insert(
        payload,
        'orders',
        {
          artistProfile: artist,
          customer: users[3].id,
          customerEmail: users[3].email,
          amount: gross / 100,
          currency: 'COP',
          paymentProvider: 'wompi',
          status: 'completed',
          fulfillmentStatus: i === 0 ? 'shipped' : 'delivered',
          subtotalCOP: gross / 100,
          shippingAmountCOP: 0,
          platformFeeAmountCOP: commission / 100,
          processorFeeAmountCOP: cost / 100,
          items: [{ product, quantity: 1 }],
          finance: {
            reference,
            demo: true,
            gross,
            subtotal: gross,
            shipping: 0,
            commission,
            commissionPercent: 12,
            processorCost: cost,
            paidAt,
            reconciledAt: paidAt,
            deliveredAt: i ? deliveredAt : null,
            blocked: i === 2,
            refunded: 0,
            refundReserved: 0,
            items: [{ product: productDocument._id, quantity: 1, unitPriceInCents: gross, title }],
          },
          shippingAddress: {
            firstName: 'Fan Demo',
            addressLine1: 'Dirección ficticia de prueba',
            city: 'Bogotá',
            country: 'CO',
          },
        },
        session,
      )
      const orderID = idOf(order._id),
        bucket = states[i]
      await journal(payload, session, {
        reference: `${reference}-payment`,
        artist,
        order: orderID,
        kind: 'preview_demo',
        postings: [
          ...transfer(
            'preview:synthetic-funds',
            account(artist, orderID, bucket),
            gross - commission - cost,
          ),
          ...transfer('preview:synthetic-funds', `oddsound:commission:${orderID}`, commission),
          ...transfer('preview:synthetic-funds', 'wompi:processing-cost', cost),
        ],
      })
      await insert(
        payload,
        'commerceShipments',
        {
          reference: `${reference}-shipment`,
          order: orderID,
          artist,
          carrier: 'coordinadora',
          guide: `DEMO${i + 1}000000`,
          allocations: [{ product, quantity: 1 }],
          state: i === 0 ? 'in_transit' : 'delivered',
          source: 'Datos ficticios de Preview',
          lastCheckedAt: new Date().toISOString(),
          ...(i
            ? {
                deliveredAt,
                verifiedAt: deliveredAt,
                verifiedBy: 'preview-seed',
                verificationEvidence: 'Simulación sin envío real',
              }
            : {}),
          history: [
            { at: paidAt, description: 'Guía de demostración: no corresponde a un envío real.' },
          ],
        },
        session,
      )
      await insert(
        payload,
        'commerceConversations',
        { order: orderID, artist, buyer: users[3].id, readAt: {} },
        session,
      )
      await insert(
        payload,
        'commerceMessages',
        {
          order: orderID,
          sender: users[3].id,
          senderRole: 'buyer',
          product,
          body: 'Mensaje ficticio: ¿puedes confirmar el estado de mi pedido de prueba?',
        },
        session,
      )
      if (i === 2)
        await insert(
          payload,
          'commerceCases',
          {
            reference: `${reference}-case`,
            order: orderID,
            artist,
            buyer: users[3].id,
            amount: 9500000,
            allocations: [{ product, quantity: 1 }],
            state: 'awaiting_seller',
            respondBy: new Date(Date.now() + 3 * 86400000).toISOString(),
            messages: [
              {
                actor: users[3].id,
                at: new Date().toISOString(),
                message: 'Reclamo ficticio para probar el buzón y la mediación.',
              },
            ],
          },
          session,
        )
      if (i === 1)
        await insert(
          payload,
          'commerceReviews',
          {
            buyer: users[3].id,
            order: orderID,
            product,
            artist,
            publicName: 'Fan Demo',
            stars: 5,
            body: 'Reseña de demostración: este servicio y la compra son ficticios.',
            hidden: false,
            history: [],
          },
          session,
        )
      if (i === 3)
        await insert(
          payload,
          'commercePayouts',
          {
            reference: `${reference}-payout`,
            artist,
            amount: gross - commission - cost,
            cycle: deliveredAt,
            state: 'paid',
            orders: [{ orderID, amount: gross - commission - cost }],
            demo: true,
          },
          session,
        )
    })
  }
  // A fictitious, unverified account exercises the verification UI without a real beneficiary.
  for (const artist of profiles)
    await model(payload, 'commerceBanks').updateOne(
      { artist },
      {
        $setOnInsert: {
          artist,
          state: 'unverified',
          revision: randomUUID(),
          lastFour: '0000',
          encryptedDetails: encryptSecret(
            JSON.stringify({
              name: 'Titular ficticio',
              bankId: 'preview-demo',
              legalIdType: 'CC',
              legalId: '00000000',
              accountType: 'AHORROS',
              accountNumber: '0000000000',
              email: 'banca@preview.oddsound.test',
            }),
          ),
        },
      },
      { upsert: true },
    )
  return {
    users: definitions.map((x) => ({ email: x.email, role: x.role })),
    profiles: slugs,
    products: products.length,
    orders: states.length,
    externalPaymentsEnabled: false,
  }
}
