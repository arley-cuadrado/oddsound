import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { CommerceError } from './domain'
import { atomic, audit, idOf, insert, model } from './store'
import { isFanUser } from '@/utilities/isEditorialUser'

export async function verifiedReviewOrder(
  payload: Payload,
  buyer: string,
  orderID: string,
  product: string,
) {
  const order = await model(payload, 'orders').findById(orderID).lean<any>()
  if (
    !order ||
    idOf(order.customer) !== buyer ||
    !order.finance?.paidAt ||
    !order.finance.items?.some((x: any) => idOf(x.product) === product)
  )
    throw new CommerceError('La reseña requiere una compra propia de este producto.', 403)
  const shipments = await model(payload, 'commerceShipments')
    .find({ order: orderID, state: 'delivered', verifiedAt: { $exists: true } })
    .lean<any[]>()
  const delivered = shipments
    .filter((s) => Boolean(s.verifiedAt))
    .flatMap((s) => s.allocations || [])
    .filter((a: any) => idOf(a.product) === product)
    .reduce((n: number, a: any) => n + a.quantity, 0)
  const quantity = order.finance.items
    .filter((x: any) => idOf(x.product) === product)
    .reduce((n: number, x: any) => n + x.quantity, 0)
  if (delivered < quantity)
    throw new CommerceError('La entrega del producto todavía no está verificada.', 409)
  return order
}

export async function saveReview(
  payload: Payload,
  user: { id: string; name?: string | null },
  input: { orderID: string; product: string; stars: number; body: string },
) {
  if (
    !Number.isInteger(input.stars) ||
    input.stars < 1 ||
    input.stars > 5 ||
    !input.body.trim() ||
    input.body.length > 2000
  )
    throw new CommerceError('Usa de 1 a 5 estrellas y un comentario de hasta 2000 caracteres.', 400)
  const order = await verifiedReviewOrder(payload, user.id, input.orderID, input.product)
  return atomic(payload, `review:${user.id}:${input.orderID}:${input.product}`, async (session) => {
    const query = { buyer: user.id, order: input.orderID, product: input.product }
    const existing = await model(payload, 'commerceReviews')
      .findOne(query)
      .session(session)
      .lean<any>()
    const values = {
      stars: input.stars,
      body: input.body.trim(),
      publicName: user.name?.trim() || 'Fan',
      updatedAt: new Date().toISOString(),
    }
    if (existing) {
      await model(payload, 'commerceReviews').updateOne(
        { _id: existing._id },
        {
          $set: values,
          $push: {
            history: { stars: existing.stars, body: existing.body, at: existing.updatedAt },
          },
        },
        { session },
      )
    } else
      await insert(
        payload,
        'commerceReviews',
        { ...query, ...values, artist: idOf(order.artistProfile), hidden: false, history: [] },
        session,
      )
    await audit(
      payload,
      user.id,
      'review_saved',
      { order: input.orderID, product: input.product },
      session,
    )
  })
}

export async function publicReviews(payload: Payload, artist: string, product?: string, page = 1) {
  const base = { artist, hidden: { $ne: true } }
  const query = { ...base, ...(product ? { product } : {}) }
  const [summary, total, reviews] = await Promise.all([
    model(payload, 'commerceReviews').aggregate([
      { $match: base },
      { $group: { _id: null, average: { $avg: '$stars' }, count: { $sum: 1 } } },
    ]),
    model(payload, 'commerceReviews').countDocuments(query),
    model(payload, 'commerceReviews')
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 20)
      .limit(20)
      .lean<any[]>(),
  ])
  return {
    rating: summary[0]
      ? { average: summary[0].average, count: summary[0].count }
      : { average: null, count: 0 },
    total,
    page,
    reviews: reviews.map((r) => ({
      id: idOf(r._id),
      publicName: r.publicName,
      stars: r.stars,
      body: r.body,
      createdAt: r.createdAt,
    })),
  }
}

export async function sendOrderMessage(
  payload: Payload,
  actor: string,
  order: any,
  role: string,
  body: string,
  product?: string,
) {
  if (!body.trim() || body.length > 5000)
    throw new CommerceError('Mensaje obligatorio, máximo 5000 caracteres.', 400)
  const items = order.finance?.items || order.items || []
  if (product && !items.some((i: any) => idOf(i.product) === product))
    throw new CommerceError('Producto ajeno al pedido.', 400)
  if (!order.finance?.paidAt && order.status !== 'completed')
    throw new CommerceError('El pedido no está pagado.', 409)
  const orderID = idOf(order._id)
  await atomic(payload, `conversation:${orderID}`, async (session) => {
    await model(payload, 'commerceConversations').updateOne(
      { order: orderID },
      {
        $setOnInsert: {
          order: orderID,
          artist: idOf(order.artistProfile),
          buyer: idOf(order.customer),
          createdAt: new Date().toISOString(),
        },
      },
      { session, upsert: true },
    )
    await insert(
      payload,
      'commerceMessages',
      {
        order: orderID,
        sender: actor,
        senderRole: role,
        product: product || '',
        body: body.trim(),
      },
      session,
    )
  })
}

type Access = (id: string) => Promise<{ order: any; seller: boolean; buyer: boolean }>
export async function handleSocial(
  payload: Payload,
  action: string,
  body: any,
  url: URL,
  user: User | null,
  admin: boolean,
  orderAccess: Access,
): Promise<Response | null> {
  const reply = (data: unknown) => Response.json(data, { headers: { 'Cache-Control': 'no-store' } })
  const page = Math.max(1, Math.min(100000, Number(url.searchParams.get('page')) || 1)) | 0
  const product = String(body.product || url.searchParams.get('product') || '')
  const orderID = String(body.orderID || url.searchParams.get('orderID') || '')
  if (action === 'reviews') {
    const p = await model(payload, 'products').findById(product).lean<any>()
    if (!p || p._status !== 'published') throw new CommerceError('Producto no encontrado.', 404)
    const result = await publicReviews(payload, idOf(p.profile), product, page)
    const eligible = []
    if (user && isFanUser(user)) {
      const orders = await model(payload, 'orders')
        .find({
          customer: user.id,
          'finance.paidAt': { $exists: true },
          'finance.items.product': p._id,
        })
        .lean<any[]>()
      for (const order of orders) {
        try {
          await verifiedReviewOrder(payload, user.id, idOf(order._id), product)
          const own = await model(payload, 'commerceReviews')
            .findOne({ buyer: user.id, order: idOf(order._id), product })
            .lean<any>()
          eligible.push({
            order: idOf(order._id),
            stars: own?.stars || 5,
            body: own?.body || '',
            hidden: own?.hidden || false,
          })
        } catch (e) {
          if (!(e instanceof CommerceError)) throw e
        }
      }
    }
    return reply({ ...result, eligible, canReport: Boolean(user) })
  }
  if (action === 'saveReview') {
    if (!user || !isFanUser(user))
      throw new CommerceError('Inicia sesión con tu cuenta de fan.', 403)
    await saveReview(payload, user, {
      orderID,
      product,
      stars: body.stars,
      body: String(body.body || ''),
    })
    return reply({ ok: true })
  }
  if (action === 'reportReview') {
    if (!user) throw new CommerceError('Inicia sesión para denunciar.', 401)
    const reason = String(body.reason || '').trim()
    if (!reason || reason.length > 2000)
      throw new CommerceError('Explica el motivo (máximo 2000 caracteres).', 400)
    const review = await model(payload, 'commerceReviews').findById(String(body.review)).lean<any>()
    if (!review || review.hidden) throw new CommerceError('Reseña no encontrada.', 404)
    await model(payload, 'commerceReviewReports').updateOne(
      { review: idOf(review._id), reporter: user.id },
      { $set: { reason, updatedAt: new Date().toISOString() } },
      { upsert: true },
    )
    return reply({ ok: true })
  }
  if (action === 'reviewModeration') {
    if (!admin) throw new CommerceError('Solo administración.', 403)
    const reports = await model(payload, 'commerceReviewReports')
      .find()
      .sort({ updatedAt: -1 })
      .skip((page - 1) * 20)
      .limit(20)
      .lean<any[]>()
    const reviews = await model(payload, 'commerceReviews')
      .find({ _id: { $in: reports.map((r) => r.review) } })
      .lean<any[]>()
    return reply({
      reports: reports.map((r) => ({
        id: idOf(r._id),
        reason: r.reason,
        review: reviews.find((x) => idOf(x._id) === r.review),
      })),
      page,
      total: await model(payload, 'commerceReviewReports').countDocuments(),
    })
  }
  if (action === 'moderateReview') {
    if (!admin || !user) throw new CommerceError('Solo administración.', 403)
    if (typeof body.hidden !== 'boolean' || !String(body.reason || '').trim())
      throw new CommerceError('Indica decisión y motivo.', 400)
    await atomic(payload, `review-moderation:${body.review}`, async (session) => {
      const r = await model(payload, 'commerceReviews')
        .findById(String(body.review))
        .session(session)
      if (!r) throw new CommerceError('Reseña no encontrada.', 404)
      await model(payload, 'commerceReviews').updateOne(
        { _id: r._id },
        { $set: { hidden: body.hidden } },
        { session },
      )
      await audit(
        payload,
        user.id,
        'review_moderated',
        { review: body.review, hidden: body.hidden, reason: String(body.reason).slice(0, 2000) },
        session,
      )
    })
    return reply({ ok: true })
  }
  if (!['conversation', 'sendMessage', 'readConversation'].includes(action)) return null
  const { order, seller } = await orderAccess(orderID)
  const actor = user?.id || `guest:${orderID}`
  if (action === 'sendMessage') {
    await sendOrderMessage(
      payload,
      actor,
      order,
      admin ? 'admin' : seller ? 'seller' : 'buyer',
      String(body.body || ''),
      product,
    )
    return reply({ ok: true })
  }
  if (action === 'readConversation') {
    const cursor = String(body.cursor || '')
    if (
      !/^\d{4}-\d\d-\d\dT/.test(cursor) ||
      !Number.isFinite(Date.parse(cursor)) ||
      Date.parse(cursor) > Date.now()
    )
      throw new CommerceError('Fecha de lectura inválida.', 400)
    await model(payload, 'commerceConversations').updateOne(
      { order: orderID },
      { $max: { [`readAt.${actor}`]: cursor } },
    )
    return reply({ ok: true })
  }
  const messages = await model(payload, 'commerceMessages')
    .find({ order: orderID })
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * 30)
    .limit(30)
    .lean<any[]>()
  const c = await model(payload, 'commerceConversations').findOne({ order: orderID }).lean<any>()
  const unread = await model(payload, 'commerceMessages').countDocuments({
    order: orderID,
    sender: { $ne: actor },
    createdAt: { $gt: c?.readAt?.[actor] || new Date(0) },
  })
  return reply({
    messages: messages.reverse().map((m) => ({
      id: idOf(m._id),
      mine: m.sender === actor,
      senderRole: m.senderRole,
      product: m.product,
      body: m.body,
      at: m.createdAt,
    })),
    unread,
    page,
    total: await model(payload, 'commerceMessages').countDocuments({ order: orderID }),
    cursor: messages.at(-1)?.createdAt || null,
  })
}
