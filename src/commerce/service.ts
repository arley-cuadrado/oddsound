import { randomBytes, randomUUID, createHash } from 'node:crypto'
import type { Payload } from 'payload'
import { encryptSecret, decryptSecret } from '@/utilities/secrets'
import { getServerSideURL } from '@/utilities/getURL'
import {
  CommerceError,
  cents,
  integer,
  transfer,
  addBusinessDays,
  deliveryEligible,
  weeklyCycle,
  validateAllocations,
  type Allocation,
} from './domain'
import {
  account,
  atomic,
  audit,
  balance,
  enqueue,
  idOf,
  insert,
  journal,
  model,
  settings,
  touchOrder,
  type Session,
} from './store'
import {
  checkoutURL,
  fetchWompiTransaction,
  findWompiTransactions,
  wompiEnvironment,
} from './wompi'

export async function financeTransaction<T>(
  payload: Payload,
  run: (session: Session) => Promise<T>,
) {
  // A single short transaction lock also serializes treasury reservations shared
  // by artists. External HTTP requests NEVER run inside this lock.
  return atomic(payload, 'commerce-financial', run)
}

export async function chargeSettings(payload: Payload) {
  const s = await settings(payload)
  if (
    !s.chargesEnabled ||
    !s.commissionConfirmed ||
    (wompiEnvironment() === 'production' && !s.productionApproved)
  )
    throw new CommerceError('Los cobros están temporalmente deshabilitados.', 503)
  return s
}

export async function sellerReady(payload: Payload, artist: string) {
  const bank = await model(payload, 'commerceBanks')
    .findOne({ artist, state: 'verified' })
    .lean<any>()
  const profile = await model(payload, 'profiles').findById(artist).lean<any>()
  return Boolean(bank && profile && !profile.commerce?.salesBlocked)
}

export async function createCheckout(
  payload: Payload,
  input: { cart: any; profile: any; group: any; contact: any; userID?: string },
) {
  const s = await chargeSettings(payload)
  const artist = idOf(input.profile.id || input.profile._id)
  if (!(await sellerReady(payload, artist)))
    throw new CommerceError('La tienda debe verificar su cuenta bancaria antes de vender.')
  const lines = input.group.items as {
    productID: string
    quantity: number
    unitPriceCOP: number
    title: string
  }[]
  if (!lines.length) throw new CommerceError('Carrito vacío.', 400)
  for (const field of ['name', 'phone', 'addressLine1', 'city', 'state'])
    if (!String(input.contact[field] || '').trim())
      throw new CommerceError('Completa nombre, teléfono y dirección de entrega en Colombia.', 400)
  const reference = `OS-${randomUUID()}`
  const expiresAt = new Date(Date.now() + 30 * 60000).toISOString()
  return financeTransaction(payload, async (session) => {
    const freshProfile = await model(payload, 'profiles')
      .findById(artist)
      .session(session)
      .lean<any>()
    const verifiedBank = await model(payload, 'commerceBanks')
      .exists({ artist, state: 'verified' })
      .session(session)
    if (!verifiedBank || freshProfile.commerce?.salesBlocked)
      throw new CommerceError('Tienda no habilitada.')
    if (typeof freshProfile.commerce?.shippingFlatRateCOP !== 'number')
      throw new CommerceError('Configura la tarifa de envío de la tienda.')
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ lines, contact: input.contact }))
      .digest('hex')
    const reusable = await model(payload, 'orders')
      .findOne({
        artistProfile: artist,
        cart: idOf(input.cart.id),
        paymentProvider: 'wompi',
        'finance.fingerprint': fingerprint,
        'finance.reservation': 'active',
        'finance.paidAt': { $exists: false },
        'finance.expiresAt': { $gt: new Date().toISOString() },
      })
      .session(session)
      .lean<any>()
    if (reusable)
      return {
        orderID: idOf(reusable._id),
        initPoint: checkoutURL({
          reference: reusable.finance.reference,
          amount: reusable.finance.gross,
          expiresAt: reusable.finance.expiresAt,
          email: reusable.customerEmail,
          redirect: `${getServerSideURL()}/cart?order=${idOf(reusable._id)}`,
        }),
      }
    // Snapshot catalog prices under the transaction; the client never sets money.
    let subtotal = 0
    const items = []
    for (const line of lines) {
      integer(line.quantity, 1)
      const product = await model(payload, 'products')
        .findById(line.productID)
        .session(session)
        .lean<any>()
      if (
        !product ||
        idOf(product.profile) !== artist ||
        product._status !== 'published' ||
        product.productType !== 'physical' ||
        product.requiresShipping === false
      )
        throw new CommerceError('Solo vendemos productos físicos disponibles con envío.')
      const price = cents(product.priceInCOP)
      if (
        price <= 0 ||
        !Number.isSafeInteger(product.inventory) ||
        product.inventory < line.quantity
      )
        throw new CommerceError('Producto sin stock disponible.')
      const reserved = await model(payload, 'products').updateOne(
        { _id: product._id, inventory: { $gte: line.quantity } },
        { $inc: { inventory: -line.quantity } },
        { session },
      )
      if (!reserved.modifiedCount) throw new CommerceError('El stock cambió. Actualiza el carrito.')
      subtotal += price * line.quantity
      integer(subtotal, 1)
      items.push({
        product: product._id,
        quantity: line.quantity,
        unitPriceInCents: price,
        title: product.title,
      })
    }
    const shipping = cents(freshProfile.commerce?.shippingFlatRateCOP || 0)
    const gross = integer(subtotal + shipping, 1)
    const commission = Math.round((subtotal * Number(s.commissionPercent)) / 100)
    if (commission < 0 || commission >= gross) throw new CommerceError('Comisión inválida.')
    const order = await insert(
      payload,
      'orders',
      {
        artistProfile: artist,
        cart: idOf(input.cart.id),
        ...(input.userID ? { customer: input.userID } : {}),
        customerEmail: input.contact.email.toLowerCase(),
        items: items.map((x: any) => ({ product: x.product, quantity: x.quantity })),
        amount: gross / 100,
        currency: 'COP',
        settlementCurrencyCode: 'COP',
        paymentProvider: 'wompi',
        subtotalCOP: subtotal / 100,
        shippingAmountCOP: shipping / 100,
        platformFeeAmountCOP: commission / 100,
        artistNetAmountCOP: (gross - commission) / 100,
        shippingAddress: { ...input.contact, firstName: input.contact.name, country: 'CO' },
        status: 'processing',
        fulfillmentStatus: 'pending_payment',
        finance: {
          reference,
          expiresAt,
          fingerprint,
          gross,
          commission,
          subtotal,
          shipping,
          commissionPercent: s.commissionPercent,
          items,
          reservation: 'active',
          refunded: 0,
          refundReserved: 0,
          processorCost: null,
        },
      },
      session,
    )
    const orderID = idOf(order._id)
    await insert(
      payload,
      'transactions',
      {
        order: orderID,
        artistProfile: artist,
        amount: gross / 100,
        currency: 'COP',
        customerEmail: input.contact.email,
        paymentProvider: 'wompi',
        status: 'pending',
        paymentProviderOrderId: reference,
      },
      session,
    )
    await enqueue(payload, reference, 'expireCheckout', { orderID }, session, new Date(expiresAt))
    const initPoint = checkoutURL({
      reference,
      amount: gross,
      expiresAt,
      email: input.contact.email,
      redirect: `${getServerSideURL()}/cart?order=${orderID}`,
    })
    return { initPoint, orderID }
  })
}

export async function processPayment(payload: Payload, transaction: any) {
  const order = await model(payload, 'orders')
    .findOne({ 'finance.reference': transaction.reference, paymentProvider: 'wompi' })
    .lean<any>()
  if (!order) throw new CommerceError('Referencia desconocida.', 404)
  const artist = idOf(order.artistProfile),
    orderID = idOf(order._id)
  if (transaction.currency !== 'COP' || transaction.amount_in_cents !== order.finance.gross)
    throw new CommerceError('El cobro no coincide con el pedido.')
  await financeTransaction(payload, async (session) => {
    const current = await model(payload, 'orders').findById(orderID).session(session).lean<any>()
    const f = current.finance
    if (f.paymentID && f.paymentID !== transaction.id && transaction.status === 'APPROVED') {
      await audit(
        payload,
        'wompi',
        'duplicate_payment_requires_refund',
        { orderID, transactionID: transaction.id },
        session,
      )
      await enqueue(
        payload,
        `duplicate-${transaction.id}`,
        'duplicatePayment',
        { orderID, transactionID: transaction.id, amount: transaction.amount_in_cents },
        session,
      )
      return
    }
    if (transaction.status === 'APPROVED' && !f.paidAt) {
      const late = f.reservation !== 'active'
      if (late) {
        // Restock was already released: do not silently fulfill a late charge.
        f.latePayment = true
        await enqueue(payload, `late-${transaction.id}`, 'latePayment', { orderID }, session)
      }
      f.paidAt = new Date().toISOString()
      f.paymentID = transaction.id
      f.reservation = late ? 'released' : 'consumed'
      f.dispatchBy = addBusinessDays(
        new Date(),
        5,
        ((await settings(payload)).holidays as string[]) || [],
      ).toISOString()
      await journal(payload, session, {
        reference: `payment-${transaction.id}`,
        artist,
        order: orderID,
        kind: 'payment',
        postings: [
          ...transfer(
            'wompi:unsettled',
            account(artist, orderID, 'pending'),
            f.gross - f.commission,
          ),
          ...(f.commission
            ? transfer('wompi:unsettled', `oddsound:commission:${orderID}`, f.commission)
            : []),
        ],
      })
      await enqueue(payload, `receipt-${orderID}`, 'receipt', { orderID }, session)
      await touchOrder(
        payload,
        orderID,
        {
          finance: f,
          status: 'completed',
          paymentProviderPaymentId: transaction.id,
          fulfillmentStatus: late ? 'cancelled' : 'ready_to_ship',
        },
        session,
      )
      await model(payload, 'transactions').updateMany(
        { order: orderID, paymentProvider: 'wompi' },
        { $set: { status: 'succeeded', paymentProviderPaymentId: transaction.id } },
        { session },
      )
    } else if (transaction.status === 'VOIDED' && f.paidAt) {
      await touchOrder(
        payload,
        orderID,
        { 'finance.blocked': true, 'finance.reversalPending': true },
        session,
      )
      await enqueue(
        payload,
        `reversal-${transaction.id}`,
        'chargebackReconciliation',
        { orderID, transactionID: transaction.id },
        session,
      )
    } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(transaction.status) && !f.paidAt) {
      // Do not release reservation from one declined attempt: checkout can be
      // retried until expiration. The expiry worker checks all attempts first.
      await audit(
        payload,
        'wompi',
        'payment_attempt_failed',
        { orderID, transactionID: transaction.id, status: transaction.status },
        session,
      )
    }
  })
}

export async function expireCheckout(payload: Payload, orderID: string) {
  const order = await model(payload, 'orders').findById(orderID).lean<any>()
  if (
    !order ||
    order.paymentProvider !== 'wompi' ||
    order.finance.paidAt ||
    order.finance.reservation !== 'active'
  )
    return
  if (new Date(order.finance.expiresAt).getTime() > Date.now())
    throw new CommerceError('Checkout aún vigente.')
  // A timeout or unavailable query leaves stock reserved, never assumes failure.
  const transactions = await findWompiTransactions(order.finance.reference)
  for (const tx of transactions)
    if (tx.status === 'APPROVED') {
      await processPayment(payload, await fetchWompiTransaction(tx.id))
      return
    }
  if (transactions.some((tx: any) => tx.status === 'PENDING'))
    throw new CommerceError('Pago todavía en proceso.')
  await financeTransaction(payload, async (session) => {
    const current = await model(payload, 'orders').findById(orderID).session(session).lean<any>()
    if (current.finance.paidAt || current.finance.reservation !== 'active') return
    for (const item of current.finance.items)
      await model(payload, 'products').updateOne(
        { _id: item.product },
        { $inc: { inventory: item.quantity } },
        { session },
      )
    await touchOrder(
      payload,
      orderID,
      { 'finance.reservation': 'released', status: 'cancelled', fulfillmentStatus: 'cancelled' },
      session,
    )
  })
}

export async function reconcileOrder(
  payload: Payload,
  actor: string,
  orderID: string,
  cost: number,
  evidence: string,
) {
  integer(cost)
  if (!evidence.trim())
    throw new CommerceError('Adjunta la referencia del extracto conciliado.', 400)
  return financeTransaction(payload, async (session) => {
    const order = await model(payload, 'orders').findById(orderID).session(session).lean<any>()
    if (!order?.finance?.paidAt || order.paymentProvider !== 'wompi' || order.finance.reconciledAt)
      throw new CommerceError('Pedido no conciliable o ya conciliado.')
    const artist = idOf(order.artistProfile)
    if (cost >= order.finance.gross - order.finance.commission)
      throw new CommerceError('El costo deja saldo no positivo; requiere revisión.')
    if (order.finance.refundReserved || order.finance.refunded)
      throw new CommerceError('Resuelve primero el reembolso antes de conciliar.')
    if (cost)
      await journal(payload, session, {
        reference: `processor-${orderID}`,
        artist,
        order: orderID,
        kind: 'processor_cost',
        postings: transfer(account(artist, orderID, 'pending'), 'wompi:processing-cost', cost),
        evidence,
      })
    await touchOrder(
      payload,
      orderID,
      {
        'finance.processorCost': cost,
        'finance.reconciledAt': new Date().toISOString(),
        processorFeeAmountCOP: cost / 100,
        artistNetAmountCOP: (order.finance.gross - order.finance.commission - cost) / 100,
      },
      session,
    )
    await audit(payload, actor, 'reconcile_order', { orderID, cost, evidence }, session)
  })
}

export async function saveBank(
  payload: Payload,
  actor: string,
  artist: string,
  details: Record<string, string>,
) {
  for (const key of [
    'name',
    'legalIdType',
    'legalId',
    'bankId',
    'accountType',
    'accountNumber',
    'email',
  ])
    if (typeof details?.[key] !== 'string' || !details[key].trim() || details[key].length > 160)
      throw new CommerceError(`Falta ${key}.`, 400)
  if (
    !/^\d{6,20}$/.test(details.accountNumber) ||
    !['AHORROS', 'CORRIENTE'].includes(details.accountType)
  )
    throw new CommerceError('Cuenta bancaria inválida.', 400)
  return financeTransaction(payload, async (session) => {
    await model(payload, 'commerceBanks').updateOne(
      { artist },
      {
        $set: {
          artist,
          encryptedDetails: encryptSecret(JSON.stringify(details)),
          lastFour: details.accountNumber.slice(-4),
          revision: randomUUID(),
          state: 'unverified',
          verifiedBy: '',
          verificationEvidence: '',
        },
      },
      { upsert: true, session },
    )
    await model(payload, 'profiles').updateOne(
      { _id: artist },
      { $set: { 'commerce.bankVerified': false } },
      { session },
    )
    await audit(payload, actor, 'bank_changed', { artist }, session)
  })
}

export async function verifyBank(
  payload: Payload,
  actor: string,
  artist: string,
  revision: string,
  evidence: string,
) {
  if (!revision || !evidence.trim())
    throw new CommerceError('La revisión de titularidad requiere evidencia y versión.', 400)
  return financeTransaction(payload, async (session) => {
    const result = await model(payload, 'commerceBanks').updateOne(
      { artist, revision, state: 'unverified' },
      { $set: { state: 'verified', verifiedBy: actor, verificationEvidence: evidence } },
      { session },
    )
    if (!result.modifiedCount)
      throw new CommerceError('La cuenta cambió. Revisa su versión actual.')
    await model(payload, 'profiles').updateOne(
      { _id: artist },
      { $set: { 'commerce.bankVerified': true } },
      { session },
    )
    await audit(payload, actor, 'bank_verified', { artist, revision, evidence }, session)
  })
}

export async function addShipment(
  payload: Payload,
  actor: string,
  orderID: string,
  carrier: string,
  guide: string,
  allocations: Allocation[],
) {
  if (!/^[a-zA-Z0-9-]{4,80}$/.test(guide)) throw new CommerceError('Guía inválida.', 400)
  return financeTransaction(payload, async (session) => {
    const config = await model(payload, 'commerceCarriers')
      .findOne({ code: carrier })
      .session(session)
      .lean<any>()
    if (!config) throw new CommerceError('Transportadora no registrada.', 400)
    const order = await model(payload, 'orders').findById(orderID).session(session).lean<any>()
    if (
      !order?.finance?.paidAt ||
      order.finance.latePayment ||
      order.finance.refundReserved ||
      order.finance.refunded
    )
      throw new CommerceError('El pedido no admite envíos.')
    const existing = await model(payload, 'commerceShipments')
      .find({ order: orderID })
      .session(session)
      .lean<any>()
    validateAllocations(
      order.finance.items.map((x: any) => ({ product: idOf(x.product), quantity: x.quantity })),
      existing.flatMap((x: any) => x.allocations || []),
      allocations,
    )
    const shipment = await insert(
      payload,
      'commerceShipments',
      {
        reference: `${carrier}-${guide}`,
        order: orderID,
        artist: idOf(order.artistProfile),
        carrier,
        guide,
        allocations,
        state: 'registered',
        history: [],
        failures: 0,
        nextCheckAt: new Date().toISOString(),
      },
      session,
    )
    await touchOrder(
      payload,
      orderID,
      { fulfillmentStatus: 'shipped', carrierName: config.name, trackingNumber: guide },
      session,
    )
    await audit(
      payload,
      actor,
      'shipment_registered',
      { orderID, shipment: idOf(shipment._id) },
      session,
    )
    return shipment
  })
}

export async function verifyDelivery(
  payload: Payload,
  actor: string,
  shipmentID: string,
  deliveredAt: string,
  evidence: string,
) {
  const time = new Date(deliveredAt).getTime()
  if (!Number.isFinite(time) || time > Date.now() || !evidence.trim())
    throw new CommerceError(
      'Se requiere fecha de entrega válida y evidencia de correspondencia con el pedido.',
      400,
    )
  return financeTransaction(payload, async (session) => {
    const shipment = await model(payload, 'commerceShipments')
      .findById(shipmentID)
      .session(session)
      .lean<any>()
    if (!shipment || shipment.verifiedAt)
      throw new CommerceError('Envío inexistente o ya verificado.')
    const order = await model(payload, 'orders')
      .findById(shipment.order)
      .session(session)
      .lean<any>()
    if (time < new Date(order.finance.paidAt).getTime())
      throw new CommerceError('La entrega antecede a la compra.')
    await model(payload, 'commerceShipments').updateOne(
      { _id: shipmentID },
      {
        $set: {
          state: 'delivered',
          deliveredAt,
          verifiedAt: new Date().toISOString(),
          verifiedBy: actor,
          verificationEvidence: evidence,
        },
      },
      { session },
    )
    const shipments = await model(payload, 'commerceShipments')
      .find({ order: shipment.order })
      .session(session)
      .lean<any>()
    const allocated = shipments.flatMap((x: any) => x.allocations || [])
    const complete = order.finance.items.every(
      (item: any) =>
        allocated
          .filter((a: Allocation) => a.product === idOf(item.product))
          .reduce((n: number, a: Allocation) => n + a.quantity, 0) === item.quantity,
    )
    if (complete && shipments.every((x: any) => x.verifiedAt && x.state === 'delivered'))
      await touchOrder(
        payload,
        shipment.order,
        {
          fulfillmentStatus: 'delivered',
          'finance.deliveredAt': new Date(
            Math.max(...shipments.map((x: any) => new Date(x.deliveredAt).getTime())),
          ).toISOString(),
        },
        session,
      )
    await audit(payload, actor, 'delivery_verified', { shipmentID, evidence }, session)
  })
}

export async function openCase(
  payload: Payload,
  actor: string,
  orderID: string,
  message: string,
  amount: number,
  allocations: Allocation[],
) {
  integer(amount, 1)
  if (!message.trim() || message.length > 5000)
    throw new CommerceError('Describe el reclamo (máximo 5000 caracteres).', 400)
  return financeTransaction(payload, async (session) => {
    const order = await model(payload, 'orders').findById(orderID).session(session).lean<any>()
    if (
      !order?.finance?.paidAt ||
      amount > order.finance.gross - order.finance.refunded - order.finance.refundReserved
    )
      throw new CommerceError('Importe de reclamo no disponible.')
    const active = await model(payload, 'commerceCases')
      .findOne({ order: orderID, state: { $nin: ['resolved', 'dismissed'] } })
      .session(session)
    if (active) throw new CommerceError('Ya hay un reclamo abierto para este pedido.')
    validateAllocations(
      order.finance.items.map((x: any) => ({ product: idOf(x.product), quantity: x.quantity })),
      [],
      allocations,
    )
    const artist = idOf(order.artistProfile)
    const s = await settings(payload)
    const dispute = await insert(
      payload,
      'commerceCases',
      {
        reference: randomUUID(),
        order: orderID,
        artist,
        buyer: actor,
        amount,
        allocations,
        state: 'awaiting_seller',
        respondBy: addBusinessDays(new Date(), 2, (s.holidays as string[]) || []).toISOString(),
        messages: [{ actor, message, at: new Date().toISOString() }],
      },
      session,
    )
    // Retain the entire order conservatively while the disputed units are assessed.
    for (const bucket of ['pending', 'available']) {
      const value = await balance(payload, account(artist, orderID, bucket), session)
      if (value > 0)
        await journal(payload, session, {
          reference: `case-${idOf(dispute._id)}-${bucket}`,
          artist,
          order: orderID,
          kind: 'dispute_hold',
          postings: transfer(
            account(artist, orderID, bucket),
            account(artist, orderID, 'held'),
            value,
          ),
        })
    }
    await touchOrder(payload, orderID, { 'finance.blocked': true }, session)
    return dispute
  })
}

export async function caseMessage(
  payload: Payload,
  actor: string,
  caseID: string,
  message: string,
  seller: boolean,
) {
  if (!message.trim() || message.length > 5000) throw new CommerceError('Mensaje inválido.', 400)
  await financeTransaction(payload, async (session) => {
    const c = await model(payload, 'commerceCases').findById(caseID).session(session).lean<any>()
    if (!c || ['resolved', 'dismissed'].includes(c.state))
      throw new CommerceError('Reclamo cerrado.')
    await model(payload, 'commerceCases').updateOne(
      { _id: caseID },
      {
        $push: { messages: { actor, message, at: new Date().toISOString() } },
        ...(seller ? { $set: { state: 'open' } } : {}),
      },
      { session },
    )
  })
}

export async function decideCase(
  payload: Payload,
  actor: string,
  caseID: string,
  input: { refund: number; sellerFault: boolean; decision: string },
) {
  integer(input.refund)
  if (!input.decision.trim()) throw new CommerceError('Motiva la decisión.', 400)
  return financeTransaction(payload, async (session) => {
    const c = await model(payload, 'commerceCases').findById(caseID).session(session).lean<any>()
    if (
      !c ||
      ['resolved', 'dismissed', 'refund_pending'].includes(c.state) ||
      input.refund > c.amount
    )
      throw new CommerceError('Decisión o importe inválido.')
    const order = await model(payload, 'orders').findById(c.order).session(session).lean<any>()
    if (input.refund > order.finance.gross - order.finance.refunded - order.finance.refundReserved)
      throw new CommerceError('El pedido ya tiene reembolsos o reversiones.')
    if (input.refund) await reserveRefund(payload, session, order, caseID, input.refund)
    await model(payload, 'commerceCases').updateOne(
      { _id: caseID },
      {
        $set: {
          state: input.refund ? 'refund_pending' : input.sellerFault ? 'resolved' : 'dismissed',
          decision: input.decision,
          sellerFault: input.sellerFault,
          decidedBy: actor,
        },
      },
      { session },
    )
    if (!input.refund) await releaseHold(payload, session, order)
    if (input.sellerFault) {
      await model(payload, 'commerceIncidents').updateOne(
        { reference: `order-${c.order}` },
        {
          $setOnInsert: {
            reference: `order-${c.order}`,
            artist: c.artist,
            order: c.order,
            caseID,
            reason: input.decision,
            decidedBy: actor,
            createdAt: new Date().toISOString(),
          },
        },
        { upsert: true, session },
      )
      const count = await model(payload, 'commerceIncidents')
        .countDocuments({ artist: c.artist })
        .session(session)
      if (count >= 3)
        await model(payload, 'profiles').updateOne(
          { _id: c.artist },
          { $set: { 'commerce.salesBlocked': true } },
          { session },
        )
    }
    await audit(payload, actor, 'case_decided', { caseID, ...input }, session)
  })
}

export async function releaseHold(payload: Payload, session: Session, order: any) {
  const artist = idOf(order.artistProfile),
    orderID = idOf(order._id)
  if (order.finance.reversalPending || order.finance.shippingException) return
  const held = await balance(payload, account(artist, orderID, 'held'), session)
  if (held > 0)
    await journal(payload, session, {
      reference: `release-hold-${randomUUID()}`,
      artist,
      order: orderID,
      kind: 'release_hold',
      postings: transfer(
        account(artist, orderID, 'held'),
        account(artist, orderID, 'pending'),
        held,
      ),
    })
  await touchOrder(payload, orderID, { 'finance.blocked': false }, session)
}

async function reserveRefund(
  payload: Payload,
  session: Session,
  order: any,
  caseID: string,
  amount: number,
) {
  const reference = `refund-${caseID}`,
    artist = idOf(order.artistProfile),
    orderID = idOf(order._id)
  // Pending/available/held funds stay frozen until the refund result is known.
  const s = await settings(payload)
  const used = await balance(payload, 'oddsound:refund-funds-used', session)
  // Reserve own liquidity for the full refund. This prevents borrowing another
  // artist's cash even when the original payout is in flight or already paid.
  if ((s.ownRefundFundsInCents || 0) < used + amount)
    throw new CommerceError('Se requiere aportar liquidez propia de Oddsound para este reembolso.')
  await journal(payload, session, {
    reference: `${reference}-funding`,
    artist,
    order: orderID,
    kind: 'refund_funding_reserved',
    postings: transfer('oddsound:treasury', 'oddsound:refund-funds-used', amount),
  })
  await insert(
    payload,
    'commerceRefunds',
    { reference, order: orderID, artist, caseID, amount, state: 'reserved', method: 'original' },
    session,
  )
  await touchOrder(
    payload,
    orderID,
    { 'finance.refundReserved': order.finance.refundReserved + amount, 'finance.blocked': true },
    session,
  )
  await enqueue(payload, reference, 'refund', { reference }, session)
}

export async function completeRefund(
  payload: Payload,
  actor: string,
  reference: string,
  evidence: string,
) {
  if (!evidence.trim())
    throw new CommerceError('Falta confirmación verificable del reembolso.', 400)
  return financeTransaction(payload, async (session) => {
    const refund = await model(payload, 'commerceRefunds')
      .findOne({ reference })
      .session(session)
      .lean<any>()
    if (!refund || refund.state === 'completed') return
    const order = await model(payload, 'orders').findById(refund.order).session(session).lean<any>()
    const artist = refund.artist,
      orderID = refund.order,
      f = order.finance
    let remaining = refund.amount
    const commissionReversal = Math.min(
      await balance(payload, `oddsound:commission:${orderID}`, session),
      Math.round((f.commission * refund.amount) / f.gross),
    )
    const postings = []
    if (commissionReversal > 0) {
      postings.push(
        ...transfer(`oddsound:commission:${orderID}`, 'buyers:refunded', commissionReversal),
      )
      remaining -= commissionReversal
    }
    for (const bucket of ['held', 'available', 'pending']) {
      const value = Math.min(
        Math.max(0, await balance(payload, account(artist, orderID, bucket), session)),
        remaining,
      )
      if (value) {
        postings.push(...transfer(account(artist, orderID, bucket), 'buyers:refunded', value))
        remaining -= value
      }
    }
    if (remaining) {
      // A negative receivable records the seller's debt, separate from spendable balances.
      postings.push(...transfer(`artist:${artist}:debt`, 'buyers:refunded', remaining))
    }
    await journal(payload, session, {
      reference: `${reference}-completed`,
      artist,
      order: orderID,
      kind: refund.method === 'chargeback' ? 'chargeback' : 'refund',
      postings,
      evidence,
    })
    await model(payload, 'commerceRefunds').updateOne(
      { reference },
      { $set: { state: 'completed', evidence } },
      { session },
    )
    if (refund.method === 'chargeback') f.reversalPending = false
    f.refunded += refund.amount
    f.refundReserved -= refund.amount
    await touchOrder(
      payload,
      orderID,
      {
        finance: f,
        ...(f.refunded === f.gross ? { status: 'refunded', fulfillmentStatus: 'refunded' } : {}),
      },
      session,
    )
    if (refund.caseID)
      await model(payload, 'commerceCases').updateOne(
        { _id: refund.caseID },
        { $set: { state: 'resolved' } },
        { session },
      )
    await releaseHold(payload, session, order)
    await audit(payload, actor, 'refund_completed', { reference, evidence }, session)
  })
}

export async function releaseAvailable(payload: Payload) {
  const orders = await model(payload, 'orders')
    .find({
      paymentProvider: 'wompi',
      'finance.paidAt': { $exists: true },
      'finance.deliveredAt': { $exists: true },
      'finance.reconciledAt': { $exists: true },
      'finance.blocked': { $ne: true },
    })
    .lean<any>()
  for (const entry of orders)
    await financeTransaction(payload, async (session) => {
      const order = await model(payload, 'orders').findById(entry._id).session(session).lean<any>()
      if (
        !deliveryEligible(order.finance) ||
        order.finance.latePayment ||
        order.finance.refundReserved
      )
        return
      const artist = idOf(order.artistProfile),
        orderID = idOf(order._id)
      const value = await balance(payload, account(artist, orderID, 'pending'), session)
      if (value > 0)
        await journal(payload, session, {
          reference: `release-${orderID}-${randomUUID()}`,
          artist,
          order: orderID,
          kind: 'available',
          postings: transfer(
            account(artist, orderID, 'pending'),
            account(artist, orderID, 'available'),
            value,
          ),
        })
    })
}

export async function preparePayouts(payload: Payload, now = new Date()) {
  const s = await settings(payload)
  if (
    !s.payoutsEnabled ||
    s.reconciliationBlocked ||
    (wompiEnvironment() === 'production' && !s.productionApproved)
  )
    return
  const feeReserve = s.payoutFeeReserveInCents || 0
  if (!Number.isSafeInteger(feeReserve) || feeReserve <= 0) return
  const observed = new Date(s.balanceObservedAt || 0).getTime()
  if (!s.balanceEvidence || now.getTime() - observed > 24 * 3600000 || observed > now.getTime())
    return
  const cycle = weeklyCycle(now, Number(s.payoutWeekday || 3), s.payoutHour ?? 9).toISOString()
  // No catch-up from previous weeks at an unexpected time.
  if (now.getTime() - new Date(cycle).getTime() > 24 * 3600000) return
  const banks = await model(payload, 'commerceBanks').find({ state: 'verified' }).lean<any>()
  for (const bank of banks)
    await financeTransaction(payload, async (session) => {
      const currentBank = await model(payload, 'commerceBanks')
        .findById(bank._id)
        .session(session)
        .lean<any>()
      if (currentBank.state !== 'verified') return
      const artist = bank.artist
      // One submission per artist per ISO week, independent of schedule edits.
      const d = new Date(cycle)
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
      const reference = `OS-${createHash('sha256')
        .update(`${artist}-${d.toISOString().slice(0, 10)}`)
        .digest('hex')
        .slice(0, 40)}`
      if (await model(payload, 'commercePayouts').exists({ reference }).session(session)) return
      const orders = await model(payload, 'orders')
        .find({ artistProfile: artist, paymentProvider: 'wompi' })
        .session(session)
        .lean<any>()
      let debt = Math.max(0, -(await balance(payload, `artist:${artist}:debt`, session)))
      const rows: { orderID: string; amount: number }[] = []
      for (const order of orders) {
        if (
          !deliveryEligible(order.finance) ||
          order.finance.refundReserved ||
          order.finance.latePayment
        )
          continue
        const orderID = idOf(order._id),
          available = account(artist, orderID, 'available')
        let amount = await balance(payload, available, session)
        if (amount <= 0) continue
        const recovered = Math.min(amount, debt)
        if (recovered) {
          await journal(payload, session, {
            reference: `debt-${reference}-${orderID}`,
            artist,
            order: orderID,
            kind: 'debt_recovery',
            postings: transfer(available, `artist:${artist}:debt`, recovered),
          })
          amount -= recovered
          debt -= recovered
        }
        if (amount) rows.push({ orderID, amount })
      }
      const amount = rows.reduce((n, x) => n + x.amount, 0)
      if (!amount) return
      const ownFeesUsed = await balance(payload, 'oddsound:payout-funds-used', session)
      if (ownFeesUsed + feeReserve > (s.ownPayoutFundsInCents || 0))
        throw new CommerceError('Falta respaldo propio para el costo de dispersión.')
      await journal(payload, session, {
        reference: `${reference}-own-fee-reserve`,
        kind: 'payout_fee_funding',
        postings: transfer('oddsound:treasury', 'oddsound:payout-funds-used', feeReserve),
      })
      const reserved = await balance(payload, 'wompi:payout-reserved', session)
      if (amount + feeReserve + reserved > (s.observedAvailableInCents || 0))
        throw new CommerceError('Saldo externo insuficiente para la dispersión.')
      for (const row of rows)
        await journal(payload, session, {
          reference: `${reference}-${row.orderID}`,
          artist,
          order: row.orderID,
          kind: 'payout_reserved',
          postings: transfer(
            account(artist, row.orderID, 'available'),
            account(artist, row.orderID, 'in_transit'),
            row.amount,
          ),
        })
      await journal(payload, session, {
        reference: `${reference}-cash`,
        artist,
        kind: 'payout_cash_reserved',
        postings: transfer('wompi:cash', 'wompi:payout-reserved', amount + feeReserve),
      })
      await insert(
        payload,
        'commercePayouts',
        {
          reference,
          artist,
          cycle,
          amount,
          feeReserve,
          orders: rows,
          bankSnapshot: { revision: bank.revision, encryptedDetails: currentBank.encryptedDetails },
          state: 'reserved',
        },
        session,
      )
      await enqueue(payload, reference, 'payout', { reference }, session)
    })
}

export async function settlePayout(
  payload: Payload,
  reference: string,
  status: string,
  evidence: string,
) {
  return financeTransaction(payload, async (session) => {
    const payout = await model(payload, 'commercePayouts')
      .findOne({ reference })
      .session(session)
      .lean<any>()
    if (!payout || ['paid', 'failed', 'cancelled'].includes(payout.state)) return
    if (!['APPROVED', 'FAILED', 'CANCELLED'].includes(status)) return
    const paid = status === 'APPROVED'
    for (const row of payout.orders)
      await journal(payload, session, {
        reference: `settle-${reference}-${row.orderID}`,
        artist: payout.artist,
        order: row.orderID,
        kind: paid ? 'payout_paid' : 'payout_failed',
        postings: transfer(
          account(payout.artist, row.orderID, 'in_transit'),
          account(payout.artist, row.orderID, paid ? 'paid' : 'pending'),
          row.amount,
        ),
        evidence,
      })
    // Consumed cash stays deducted from the last observed external balance until
    // a new balance attestation reconciles it; do not free it on success.
    if (!paid && payout.feeReserve)
      await journal(payload, session, {
        reference: `${reference}-own-fee-release`,
        kind: 'payout_fee_funding_released',
        postings: transfer('oddsound:payout-funds-used', 'oddsound:treasury', payout.feeReserve),
      })
    if (!paid)
      await journal(payload, session, {
        reference: `${reference}-cash-release`,
        artist: payout.artist,
        kind: 'cash_release',
        postings: transfer(
          'wompi:payout-reserved',
          'wompi:cash',
          payout.amount + (payout.feeReserve || 0),
        ),
      })
    await model(payload, 'commercePayouts').updateOne(
      { reference },
      { $set: { state: paid ? 'paid' : 'failed', providerState: status } },
      { session },
    )
    await audit(payload, 'wompi', 'payout_result', { reference, status, evidence }, session)
  })
}

export async function issueGuestAccess(payload: Payload, orderID: string) {
  const token = randomBytes(32).toString('base64url')
  await insert(payload, 'commerceGuestAccess', {
    order: orderID,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  })
  return token
}

export function bankDetails(bank: any) {
  return JSON.parse(decryptSecret(bank.encryptedDetails))
}

/** A reported bank reversal is a fact to reconcile, not a new refund request. */
export async function recordChargeback(
  payload: Payload,
  actor: string,
  orderID: string,
  amount: number,
  providerReference: string,
  evidence: string,
) {
  integer(amount, 1)
  if (!providerReference || !evidence.trim())
    throw new CommerceError('Se requiere referencia y extracto del contracargo.', 400)
  const reference = `chargeback-${createHash('sha256').update(providerReference).digest('hex')}`
  await financeTransaction(payload, async (session) => {
    const order = await model(payload, 'orders').findById(orderID).session(session).lean<any>()
    if (!order?.finance?.paidAt || amount > order.finance.gross - order.finance.refunded)
      throw new CommerceError('Contracargo inválido.')
    if (await model(payload, 'commerceRefunds').exists({ reference }).session(session)) return
    if (order.finance.refundReserved)
      throw new CommerceError(
        'Hay un reembolso en curso. Conciliar ambos movimientos antes de registrarlos, sin enviar otro reembolso.',
      )
    await insert(
      payload,
      'commerceRefunds',
      {
        reference,
        order: orderID,
        artist: idOf(order.artistProfile),
        amount,
        state: 'pending',
        method: 'chargeback',
      },
      session,
    )
    await touchOrder(
      payload,
      orderID,
      { 'finance.refundReserved': amount, 'finance.blocked': true },
      session,
    )
    await audit(
      payload,
      actor,
      'chargeback_reported',
      { reference, orderID, amount, evidence },
      session,
    )
  })
  await completeRefund(payload, actor, reference, evidence)
}
