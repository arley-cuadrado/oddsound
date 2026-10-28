import type { Payload } from 'payload'
import { randomUUID } from 'node:crypto'
import { CommerceError } from './domain'
import { model, settings } from './store'
import {
  expireCheckout,
  financeTransaction,
  issueGuestAccess,
  preparePayouts,
  processPayment,
  releaseAvailable,
  settlePayout,
  bankDetails,
} from './service'
import { fetchWompiTransaction, payoutsAPI, wompiEnvironment, wompiRefund } from './wompi'
import { pollTracking, seedCarriers } from './tracking'
import { getServerSideURL } from '@/utilities/getURL'

async function sendAccessEmail(payload: Payload, orderID: string) {
  const order = await model(payload, 'orders').findById(orderID).lean<any>()
  if (!order?.finance?.paidAt) return
  const token = await issueGuestAccess(payload, orderID)
  const url = `${getServerSideURL()}/shop/orders?order=${orderID}#token=${token}`
  await payload.sendEmail({
    to: order.customerEmail,
    subject: 'Tu compra en Oddsound',
    text: `Consulta tu compra, sus envíos y reclamos: ${url}\nEl enlace vence en siete días.`,
  })
}

async function processEvent(payload: Payload, reference: string) {
  const event = await model(payload, 'commerceEvents').findOne({ reference }).lean<any>()
  if (!event || event.state === 'processed') return
  const body = event.body
  if (event.channel === 'charges') {
    const tx = await fetchWompiTransaction(body.data.transaction.id)
    await processPayment(payload, tx)
  } else if (body.event === 'transaction.updated') {
    const tx = body.data.transaction
    // Match a provider-assigned transaction id saved from the original request.
    // If only the payout id is available, fetch its transactions to bind by our
    // reference before allowing a transfer to become paid.
    let payout = await model(payload, 'commercePayouts')
      .findOne({ providerTransactionID: tx.id })
      .lean<any>()
    if (!payout && tx.payoutId) {
      const result = await payoutsAPI(`/payouts/${encodeURIComponent(tx.payoutId)}/transactions`)
      const rows = Array.isArray(result.data) ? result.data : result.transactions
      const match = rows?.find((r: any) => r.id === tx.id)
      if (match?.reference)
        payout = await model(payload, 'commercePayouts')
          .findOne({ reference: match.reference, providerID: tx.payoutId })
          .lean<any>()
    }
    if (!payout)
      throw new Error('Dispersión sin correspondencia verificada; requiere conciliación.')
    if (
      tx.currency !== 'COP' ||
      tx.amountInCents !== payout.amount ||
      tx.payoutId !== payout.providerID
    )
      throw new Error('Dispersión inconsistente.')
    await settlePayout(payload, payout.reference, tx.status, `event:${reference}`)
  } else if (body.event === 'payout.updated') {
    // Aggregate success/partial success never settles all beneficiaries.
    await model(payload, 'commercePayouts').updateMany(
      { providerID: body.data.payout.id, state: { $nin: ['paid', 'failed', 'cancelled'] } },
      { $set: { providerState: body.data.payout.status } },
    )
  }
  await model(payload, 'commerceEvents').updateOne({ reference }, { $set: { state: 'processed' } })
}

async function submitPayout(payload: Payload, reference: string) {
  const s = await settings(payload)
  if (
    !s.payoutsEnabled ||
    s.reconciliationBlocked ||
    (wompiEnvironment() === 'production' && !s.productionApproved)
  )
    throw new CommerceError('Dispersiones pausadas.')
  const payout = await financeTransaction(payload, async (session) => {
    const p = await model(payload, 'commercePayouts')
      .findOne({ reference })
      .session(session)
      .lean<any>()
    if (!p || p.state !== 'reserved') return null
    const bank = await model(payload, 'commerceBanks')
      .findOne({ artist: p.artist, state: 'verified', revision: p.bankSnapshot.revision })
      .session(session)
      .lean<any>()
    if (!bank) throw new CommerceError('La cuenta bancaria cambió; requiere revisión.')
    for (const row of p.orders) {
      const order = await model(payload, 'orders')
        .findById(row.orderID)
        .session(session)
        .lean<any>()
      if (order.finance.blocked || order.finance.refundReserved)
        throw new CommerceError('Un reclamo bloquea esta liquidación.')
    }
    await model(payload, 'commercePayouts').updateOne(
      { reference },
      { $set: { state: 'submitting', updatedAt: new Date().toISOString() } },
      { session },
    )
    return p
  })
  if (!payout) return // Never POST a second time after uncertain submission.
  try {
    if (!process.env.WOMPI_PAYOUTS_ACCOUNT_ID || !process.env.WOMPI_PAYOUTS_PAYMENT_TYPE)
      throw new Error('Cuenta origen o tipo de pago sin configurar.')
    const details = bankDetails(payout.bankSnapshot)
    const result = await payoutsAPI(
      '/payouts',
      {
        reference,
        accountId: process.env.WOMPI_PAYOUTS_ACCOUNT_ID,
        paymentType: process.env.WOMPI_PAYOUTS_PAYMENT_TYPE,
        transactions: [{ ...details, amount: payout.amount, reference }],
      },
      reference,
    )
    const data = result.data || result
    if (!data.id) throw new Error('La respuesta no contiene ID de lote.')
    const tx = data.transactions?.find((r: any) => r.reference === reference)
    await model(payload, 'commercePayouts').updateOne(
      { reference },
      {
        $set: {
          providerID: data.id,
          ...(tx?.id ? { providerTransactionID: tx.id } : {}),
          state:
            data.status === 'PENDING_APPROVAL' || !s.automaticPayoutsApproved
              ? 'pending_approval'
              : 'pending',
          providerState: data.status || 'PENDING_APPROVAL',
        },
      },
    )
  } catch (error) {
    await model(payload, 'commercePayouts').updateOne(
      { reference },
      {
        $set: {
          state: 'unknown',
          error: error instanceof Error ? error.message : 'Resultado incierto.',
        },
      },
    )
    throw error
  }
}

async function submitRefund(payload: Payload, reference: string) {
  const s = await settings(payload)
  if (!s.refundsEnabled || (wompiEnvironment() === 'production' && !s.productionApproved))
    throw new CommerceError('Reembolsos pausados.')
  const refund = await model(payload, 'commerceRefunds')
    .findOneAndUpdate(
      { reference, state: 'reserved' },
      { $set: { state: 'submitting', updatedAt: new Date().toISOString() } },
      { new: true },
    )
    .lean<any>()
  if (!refund) return
  const order = await model(payload, 'orders').findById(refund.order).lean<any>()
  try {
    const result = await wompiRefund(order.finance.paymentID, refund.amount, reference)
    const data = result.data || result
    await model(payload, 'commerceRefunds').updateOne(
      { reference },
      {
        $set: {
          state: 'pending',
          providerID: data.id || '',
          request: { transactionID: order.finance.paymentID, amount: refund.amount },
        },
      },
    )
    // Explicit confirmation/reconciliation is required: accepted != completed.
  } catch (error) {
    await model(payload, 'commerceRefunds').updateOne(
      { reference },
      {
        $set: {
          state: 'unknown',
          error: error instanceof Error ? error.message : 'Resultado incierto.',
        },
      },
    )
    throw error
  }
}

export async function runTask(payload: Payload, task: any) {
  if (task.kind === 'event') return processEvent(payload, task.data.reference)
  if (task.kind === 'expireCheckout') return expireCheckout(payload, task.data.orderID)
  if (task.kind === 'payout') return submitPayout(payload, task.data.reference)
  if (task.kind === 'refund') return submitRefund(payload, task.data.reference)
  if (['receipt', 'guestEmail'].includes(task.kind))
    return sendAccessEmail(payload, task.data.orderID)
  if (['duplicatePayment', 'latePayment', 'chargebackReconciliation'].includes(task.kind))
    throw new CommerceError('Cobro excepcional: requiere mediación y reembolso administrativo.')
  throw new Error('Tarea desconocida.')
}

async function pollPayouts(payload: Payload) {
  await model(payload, 'commercePayouts').updateMany(
    { state: 'submitting', updatedAt: { $lt: new Date(Date.now() - 120000).toISOString() } },
    {
      $set: {
        state: 'unknown',
        error: 'El worker se interrumpió durante el envío. Conciliar antes de reintentar.',
      },
    },
  )
  const pending = await model(payload, 'commercePayouts')
    .find({
      providerID: { $exists: true, $ne: '' },
      state: { $in: ['pending', 'pending_approval', 'unknown'] },
    })
    .limit(20)
    .lean<any[]>()
  for (const payout of pending) {
    try {
      const result = await payoutsAPI(
        `/payouts/${encodeURIComponent(payout.providerID)}/transactions`,
      )
      const rows = Array.isArray(result.data) ? result.data : result.transactions
      const tx = rows?.find((x: any) => x.reference === payout.reference)
      if (!tx || (tx.amountInCents ?? tx.amount) !== payout.amount)
        throw new Error('No coincide beneficiario e importe del lote.')
      await model(payload, 'commercePayouts').updateOne(
        { _id: payout._id },
        { $set: { providerTransactionID: tx.id, providerState: tx.status } },
      )
      await settlePayout(payload, payout.reference, tx.status, `provider:${tx.id}`)
    } catch (error) {
      await model(payload, 'commercePayouts').updateOne(
        { _id: payout._id },
        { $set: { error: error instanceof Error ? error.message : 'Consulta pendiente.' } },
      )
    }
  }
}

export async function workerTick(payload: Payload) {
  await seedCarriers(payload)
  await model(payload, 'commerceTasks').updateMany(
    { state: 'running', attempts: { $gte: 10 }, leaseUntil: { $lt: new Date().toISOString() } },
    { $set: { state: 'failed', error: 'El último intento se interrumpió; requiere revisión.' } },
  )
  // Persisted leases recover work after a killed worker. Short batches allow
  // heartbeat, shutdown and backoff without relying on serverless request life.
  for (let n = 0; n < 20; n++) {
    const token = randomUUID(),
      now = new Date()
    const task = await model(payload, 'commerceTasks')
      .findOneAndUpdate(
        {
          dueAt: { $lte: now.toISOString() },
          attempts: { $lt: 10 },
          $or: [{ state: 'pending' }, { state: 'running', leaseUntil: { $lt: now.toISOString() } }],
        },
        {
          $set: {
            state: 'running',
            leaseUntil: new Date(Date.now() + 120000).toISOString(),
            leaseToken: token,
          },
          $inc: { attempts: 1 },
        },
        { new: true, sort: { dueAt: 1 } },
      )
      .lean<any>()
    if (!task) break
    try {
      await runTask(payload, task)
      await model(payload, 'commerceTasks').updateOne(
        { _id: task._id, leaseToken: token },
        { $set: { state: 'completed', error: '' } },
      )
    } catch (error) {
      await model(payload, 'commerceTasks').updateOne(
        { _id: task._id, leaseToken: token },
        {
          $set: {
            state: task.attempts >= 10 ? 'failed' : 'pending',
            dueAt: new Date(
              Date.now() + Math.min(3600000, 30000 * 2 ** task.attempts),
            ).toISOString(),
            error: error instanceof Error ? error.message : 'Falló la tarea.',
          },
        },
      )
    }
  }
  await model(payload, 'commerceCases').updateMany(
    { state: 'awaiting_seller', respondBy: { $lt: new Date().toISOString() } },
    { $set: { state: 'escalated' } },
  )
  await pollPayouts(payload)
  await releaseAvailable(payload)
  try {
    await preparePayouts(payload)
  } catch (error) {
    payload.logger.error({ error }, 'No se pudo preparar la dispersión; saldos conservados.')
  }
  const shipments = await model(payload, 'commerceShipments')
    .find({
      nextCheckAt: { $lte: new Date().toISOString() },
      state: { $nin: ['delivered', 'returned'] },
    })
    .limit(20)
    .lean<any[]>()
  // Sequential per-domain polling provides a conservative limit in this worker.
  for (const shipment of shipments) {
    const claimed = await model(payload, 'commerceShipments')
      .findOneAndUpdate(
        { _id: shipment._id, nextCheckAt: { $lte: new Date().toISOString() } },
        { $set: { nextCheckAt: new Date(Date.now() + 10 * 60000).toISOString() } },
        { new: true },
      )
      .lean<any>()
    if (claimed) await pollTracking(payload, claimed)
  }
}
