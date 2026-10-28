import config from '@payload-config'
import { getPayload } from 'payload'
import { createHash } from 'node:crypto'
import { isAdminUser } from '@/utilities/isAdminUser'
import { resolveUserProfileID } from '@/utilities/commerceProducts'
import { encryptSecret, decryptSecret } from '@/utilities/secrets'
import { getServerSideURL } from '@/utilities/getURL'
import { CommerceError, CARRIERS, integer, nextCycle, trackingLink } from './domain'
import { account, audit, balance, idOf, insert, model, settings } from './store'
import {
  addShipment,
  bankDetails,
  caseMessage,
  completeRefund,
  decideCase,
  financeTransaction,
  openCase,
  reconcileOrder,
  recordChargeback,
  releaseHold,
  saveBank,
  verifyBank,
  verifyDelivery,
} from './service'

const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  })

export async function handleCommerce(request: Request, forcedAction?: string): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    const url = new URL(request.url)
    let body: any = {}
    if (request.method !== 'GET') {
      const origin = request.headers.get('origin')
      if (origin && origin !== new URL(getServerSideURL()).origin)
        throw new CommerceError('Origen inválido.', 403)
      const raw = await request.text()
      if (raw.length > 3000000) throw new CommerceError('Archivo o petición demasiado grande.', 413)
      try {
        body = JSON.parse(raw)
      } catch {
        throw new CommerceError('JSON inválido.', 400)
      }
      if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new CommerceError('Petición inválida.', 400)
    }
    const action = forcedAction || body.action || url.searchParams.get('action') || 'overview'
    const { user } = await payload.auth({ headers: request.headers })
    const admin = isAdminUser(user)
    const artist = user ? resolveUserProfileID(user) : null
    const orderID = String(body.orderID || url.searchParams.get('orderID') || '')
    const caseID = String(body.caseID || url.searchParams.get('caseID') || '')
    const actor = user?.id || 'guest'
    const requireAdmin = () => {
      if (!admin) throw new CommerceError('Solo administración.', 403)
    }
    const orderAccess = async (id: string, sellerOnly = false) => {
      const order = await model(payload, 'orders').findById(id).lean<any>()
      if (!order) throw new CommerceError('Pedido no encontrado.', 404)
      const seller = Boolean(artist && idOf(order.artistProfile) === artist)
      const buyer = Boolean(user && idOf(order.customer) === user.id)
      let guest = false
      if (!sellerOnly && !buyer && !admin) {
        const cookie = request.headers
          .get('cookie')
          ?.split(';')
          .map((x: any) => x.trim())
          .find((x: any) => x.startsWith(`os-order-${id}=`))
          ?.split('=')[1]
        if (cookie)
          guest = Boolean(
            await model(payload, 'commerceGuestAccess').exists({
              order: id,
              tokenHash: createHash('sha256').update(cookie).digest('hex'),
              expiresAt: { $gt: new Date().toISOString() },
            }),
          )
      }
      if (!admin && (sellerOnly ? !seller : !seller && !buyer && !guest))
        throw new CommerceError('No tienes acceso a este pedido.', 403)
      return { order, seller, buyer: buyer || guest }
    }
    if (action === 'guestRequest') {
      if (!/^[a-f0-9]{24}$/i.test(orderID))
        return reply({ message: 'Si los datos coinciden, recibirás un enlace por correo.' })
      // Generic reply, cooldown enforced on the order, no public email enumeration.
      await financeTransaction(payload, async (session) => {
        const order = await model(payload, 'orders')
          .findOne({
            _id: orderID,
            customerEmail: String(body.email || '')
              .trim()
              .toLowerCase(),
            'finance.paidAt': { $exists: true },
          })
          .session(session)
          .lean<any>()
        if (!order || Date.now() - new Date(order.finance.guestRequestedAt || 0).getTime() < 300000)
          return
        await model(payload, 'orders').updateOne(
          { _id: orderID },
          { $set: { 'finance.guestRequestedAt': new Date().toISOString() } },
          { session },
        )
        await model(payload, 'commerceTasks').updateOne(
          { reference: `guest-${orderID}-${Math.floor(Date.now() / 300000)}` },
          {
            $setOnInsert: {
              reference: `guest-${orderID}-${Math.floor(Date.now() / 300000)}`,
              kind: 'guestEmail',
              data: { orderID },
              dueAt: new Date().toISOString(),
              state: 'pending',
            },
          },
          { upsert: true, session },
        )
      })
      return reply({ message: 'Si los datos coinciden, recibirás un enlace por correo.' })
    }
    if (action === 'guestVerify') {
      const token = String(body.token || '')
      const access = await model(payload, 'commerceGuestAccess').exists({
        order: orderID,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: { $gt: new Date().toISOString() },
      })
      if (!access) throw new CommerceError('Enlace expirado o inválido.', 403)
      const response = reply({ ok: true })
      response.headers.set(
        'Set-Cookie',
        `os-order-${orderID}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
      )
      return response
    }
    if (action === 'overview') {
      if (!user && !orderID)
        throw new CommerceError('Inicia sesión o verifica tu compra por correo.', 401)
      const s = await settings(payload)
      const q = orderID
        ? { _id: (await orderAccess(orderID)).order._id }
        : admin
          ? { paymentProvider: 'wompi' }
          : artist
            ? { artistProfile: artist }
            : { customer: user!.id }
      const orders = await model(payload, 'orders')
        .find(q)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean<any>()
      const carrierCatalogue = await model(payload, 'commerceCarriers').find().lean<any[]>()
      const rows = []
      for (const o of orders) {
        const oid = idOf(o._id),
          aid = idOf(o.artistProfile)
        const shipments = await model(payload, 'commerceShipments').find({ order: oid }).lean<any>()
        const cases = await model(payload, 'commerceCases').find({ order: oid }).lean<any>()
        const buckets = Object.fromEntries(
          await Promise.all(
            ['pending', 'held', 'available', 'in_transit', 'paid'].map(async (b) => [
              b,
              await balance(payload, account(aid, oid, b)),
            ]),
          ),
        )
        rows.push({
          id: oid,
          artist: aid,
          status: o.status,
          paymentProvider: o.paymentProvider,
          fulfillmentStatus: o.fulfillmentStatus,
          total: o.amount,
          commission: o.platformFeeAmountCOP,
          processorCost: o.processorFeeAmountCOP,
          finance: {
            buckets,
            paidAt: o.finance?.paidAt,
            dispatchBy: o.finance?.dispatchBy,
            deliveredAt: o.finance?.deliveredAt,
            reconciledAt: o.finance?.reconciledAt,
            blocked: o.finance?.blocked,
          },
          items: o.finance?.items?.map((x: any) => ({
            product: idOf(x.product),
            quantity: x.quantity,
            title: x.title,
          })),
          shipments: shipments.map((x: any) => ({
            id: idOf(x._id),
            guide: x.guide,
            carrier: x.carrier,
            state: x.state,
            history: x.history,
            lastCheckedAt: x.lastCheckedAt,
            estimatedDeliveryAt: x.estimatedDeliveryAt,
            verifiedAt: x.verifiedAt,
            error: x.error,
            link: String(
              carrierCatalogue.find((c: any) => c.code === x.carrier)?.officialURL ||
                trackingLink(x.carrier, x.guide),
            ).replace('{guide}', encodeURIComponent(x.guide)),
          })),
          cases: cases.map((x: any) => ({
            id: idOf(x._id),
            amount: x.amount,
            state: x.state,
            messages: x.messages,
            decision: x.decision,
            respondBy: x.respondBy,
          })),
        })
      }
      const bank = artist
        ? await model(payload, 'commerceBanks').findOne({ artist }).lean<any>()
        : null
      const payouts =
        user && (admin || artist)
          ? await model(payload, 'commercePayouts')
              .find(admin ? {} : { artist })
              .sort({ createdAt: -1 })
              .limit(100)
              .lean<any>()
          : []
      return reply({
        orders: rows,
        carriers: carrierCatalogue.length
          ? carrierCatalogue.map((c: any) => ({ code: c.code, name: c.name }))
          : CARRIERS,
        nextPayout: nextCycle(
          new Date(),
          Number(s.payoutWeekday ?? 3),
          s.payoutHour ?? 9,
        ).toISOString(),
        bank: bank ? { state: bank.state, lastFour: bank.lastFour, revision: bank.revision } : null,
        payouts: payouts.map((p: any) => ({
          reference: p.reference,
          amount: p.amount,
          state: p.state,
          cycle: p.cycle,
          error: p.error,
        })),
        ...(admin
          ? {
              settings: s,
              carrierAssessments: carrierCatalogue.map((c: any) => ({
                code: c.code,
                name: c.name,
                apiEnabled: c.apiEnabled,
                scrapingEnabled: c.scrapingEnabled,
                assessment: c.assessment,
              })),
              banks: await model(payload, 'commerceBanks')
                .find()
                .select('artist lastFour revision state verificationEvidence')
                .lean<any>(),
              refunds: await model(payload, 'commerceRefunds')
                .find()
                .select('reference order state amount')
                .limit(100)
                .lean<any>(),
              alerts: await model(payload, 'commerceTasks')
                .find({ state: 'failed' })
                .select('reference kind error')
                .limit(50)
                .lean<any>(),
            }
          : {}),
      })
    }
    if (action === 'banks') {
      if (!artist && !admin) throw new CommerceError('Necesitas un perfil de artista.', 403)
      const { payoutsAPI } = await import('./wompi')
      const result = await payoutsAPI('/banks')
      const rows = Array.isArray(result.data) ? result.data : result.banks
      return reply({
        banks: Array.isArray(rows) ? rows.map((b: any) => ({ id: b.id, name: b.name })) : [],
      })
    }
    if (action === 'bank') {
      if (!artist) throw new CommerceError('Necesitas un perfil de artista.', 403)
      await saveBank(payload, actor, artist, body.details)
      return reply({ message: 'Cuenta pendiente de verificación.' })
    }
    if (action === 'shipment') {
      const { order } = await orderAccess(orderID, true)
      if (order.paymentProvider !== 'wompi')
        throw new CommerceError('Pedido histórico: requiere gestión administrativa.')
      if (body.fulfillmentStatus === 'delivered')
        throw new CommerceError('La entrega requiere evidencia y verificación independiente.', 403)
      const allocations =
        body.allocations ||
        order.finance.items.map((x: any) => ({ product: idOf(x.product), quantity: x.quantity }))
      const result = await addShipment(
        payload,
        actor,
        orderID,
        String(body.carrier || body.carrierName || ''),
        String(body.guide || body.trackingNumber || ''),
        allocations,
      )
      return reply({
        id: idOf(result._id),
        order: {
          fulfillmentStatus: 'shipped',
          trackingNumber: result.guide,
          carrierName: result.carrier,
        },
      })
    }
    if (action === 'openCase') {
      const { order, buyer } = await orderAccess(orderID)
      if (!buyer && !admin)
        throw new CommerceError('Solo el comprador puede abrir el reclamo.', 403)
      const allocations =
        body.allocations ||
        order.finance.items.map((x: any) => ({ product: idOf(x.product), quantity: x.quantity }))
      const c = await openCase(
        payload,
        actor,
        orderID,
        String(body.message || ''),
        integer(body.amount, 1),
        allocations,
      )
      return reply({ caseID: idOf(c._id) })
    }
    if (['message', 'attachment', 'downloadAttachment'].includes(action)) {
      const c = await model(payload, 'commerceCases').findById(caseID).lean<any>()
      if (!c) throw new CommerceError('Reclamo no encontrado.', 404)
      const { seller } = await orderAccess(c.order)
      if (action === 'message')
        await caseMessage(payload, actor, caseID, String(body.message || ''), seller)
      if (action === 'attachment') {
        const content = String(body.content || ''),
          mime = String(body.mime || '')
        if (
          !['image/png', 'image/jpeg', 'application/pdf'].includes(mime) ||
          content.length > 2800000 ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(content)
        )
          throw new CommerceError('Adjunto inválido; usa PNG, JPEG o PDF hasta 2 MB.', 400)
        const file = Buffer.from(content, 'base64')
        const magic =
          mime === 'application/pdf'
            ? file.subarray(0, 5).toString() === '%PDF-'
            : mime === 'image/png'
              ? file.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
              : file.subarray(0, 3).toString('hex') === 'ffd8ff'
        if (!magic) throw new CommerceError('El archivo no coincide con su tipo.', 400)
        const attachment = await insert(payload, 'commerceAttachments', {
          caseID,
          name: String(body.name || 'evidencia')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .slice(0, 100),
          mime,
          encryptedContent: encryptSecret(content),
        })
        await caseMessage(payload, actor, caseID, `Adjunto: ${idOf(attachment._id)}`, seller)
        return reply({ attachmentID: idOf(attachment._id) })
      }
      if (action === 'downloadAttachment') {
        const attachment = await model(payload, 'commerceAttachments')
          .findOne({ _id: String(url.searchParams.get('attachmentID') || ''), caseID })
          .lean<any>()
        if (!attachment) throw new CommerceError('Adjunto no encontrado.', 404)
        return new Response(Buffer.from(decryptSecret(attachment.encryptedContent), 'base64'), {
          headers: {
            'Content-Type': attachment.mime,
            'Content-Disposition': `attachment; filename="${attachment.name}"`,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
          },
        })
      }
      return reply({ ok: true })
    }
    requireAdmin()
    if (action === 'verifyBank')
      await verifyBank(
        payload,
        actor,
        String(body.artist),
        String(body.revision),
        String(body.evidence || ''),
      )
    else if (action === 'inspectBank') {
      const bank = await model(payload, 'commerceBanks')
        .findOne({ artist: String(body.artist) })
        .lean<any>()
      if (!bank) throw new CommerceError('Cuenta no encontrada.', 404)
      await audit(payload, actor, 'inspect_bank', { artist: body.artist })
      return reply({ details: bankDetails(bank), revision: bank.revision })
    } else if (action === 'registerCarrier') {
      const code = String(body.code || ''),
        name = String(body.name || '')
      const official = new URL(String(body.officialURL || ''))
      if (
        !/^[a-z0-9-]{2,40}$/.test(code) ||
        !name ||
        official.protocol !== 'https:' ||
        official.port ||
        official.username ||
        !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(official.hostname) ||
        !body.assessment?.evidence
      )
        throw new CommerceError(
          'Registra dominio oficial, identidad, habilitación aplicable y evidencia.',
          400,
        )
      await model(payload, 'commerceCarriers').updateOne(
        { code },
        {
          $setOnInsert: {
            code,
            name,
            officialURL: official.toString(),
            apiEnabled: false,
            scrapingEnabled: false,
            assessment: body.assessment,
          },
        },
        { upsert: true },
      )
      await audit(payload, actor, 'carrier_registered', {
        code,
        name,
        evidence: body.assessment.evidence,
      })
    } else if (action === 'configureCarrier') {
      const c = await model(payload, 'commerceCarriers')
        .findOne({ code: String(body.code) })
        .lean<any>()
      if (!c || !body.assessment?.evidence || !body.assessment?.authorizedGuidesTested)
        throw new CommerceError(
          'Documenta condiciones de acceso, evidencia de entrega y pruebas autorizadas antes de habilitar el conector.',
          400,
        )
      await model(payload, 'commerceCarriers').updateOne(
        { code: c.code },
        {
          $set: {
            officialURL: c.officialURL,
            assessment: body.assessment,
            apiEnabled: body.apiEnabled === true,
            scrapingEnabled: body.scrapingEnabled === true,
            apiConfig: body.apiConfig || {},
            scrapingConfig: body.scrapingConfig || {},
          },
        },
      )
      await audit(payload, actor, 'carrier_configured', {
        code: c.code,
        assessment: body.assessment,
      })
    } else if (action === 'cancelPayout') {
      if (!String(body.evidence || '').trim())
        throw new CommerceError('Motiva la cancelación.', 400)
      await financeTransaction(payload, async (session) => {
        const p = await model(payload, 'commercePayouts')
          .findOne({
            reference: String(body.reference),
            state: 'reserved',
            providerID: { $exists: false },
          })
          .session(session)
          .lean<any>()
        if (!p)
          throw new CommerceError(
            'Solo se puede cancelar una liquidación que nunca se ha enviado al proveedor.',
          )
        const { journal } = await import('./store')
        const { transfer } = await import('./domain')
        for (const row of p.orders)
          await journal(payload, session, {
            reference: `cancel-${p.reference}-${row.orderID}`,
            artist: p.artist,
            order: row.orderID,
            kind: 'payout_cancelled',
            postings: transfer(
              account(p.artist, row.orderID, 'in_transit'),
              account(p.artist, row.orderID, 'pending'),
              row.amount,
            ),
          })
        await journal(payload, session, {
          reference: `cancel-cash-${p.reference}`,
          kind: 'cash_release',
          postings: transfer('wompi:payout-reserved', 'wompi:cash', p.amount + (p.feeReserve || 0)),
        })
        if (p.feeReserve)
          await journal(payload, session, {
            reference: `cancel-fee-${p.reference}`,
            kind: 'payout_fee_funding_released',
            postings: transfer('oddsound:payout-funds-used', 'oddsound:treasury', p.feeReserve),
          })
        await model(payload, 'commercePayouts').updateOne(
          { _id: p._id },
          { $set: { state: 'cancelled' } },
          { session },
        )
        await audit(
          payload,
          actor,
          'unsent_payout_cancelled',
          { reference: p.reference, evidence: body.evidence },
          session,
        )
      })
    } else if (action === 'reconcilePayoutFee') {
      const cost = integer(body.cost)
      if (!String(body.evidence || '').trim())
        throw new CommerceError('Se requiere extracto del costo de dispersión.', 400)
      await financeTransaction(payload, async (session) => {
        const p = await model(payload, 'commercePayouts')
          .findOne({ reference: String(body.reference), state: 'paid' })
          .session(session)
          .lean<any>()
        if (!p) throw new CommerceError('La liquidación debe estar confirmada.')
        if (p.actualFee != null) {
          if (p.actualFee !== cost)
            throw new CommerceError(
              'Costo ya conciliado. Usa un asiento compensatorio para corregirlo.',
            )
          return
        }
        const { journal } = await import('./store')
        const { transfer } = await import('./domain')
        const difference = (p.feeReserve || 0) - cost
        if (difference)
          await journal(payload, session, {
            reference: `payout-fee-adjustment-${p.reference}`,
            kind: 'payout_fee_funding_adjustment',
            postings:
              difference > 0
                ? transfer('oddsound:payout-funds-used', 'oddsound:treasury', difference)
                : transfer('oddsound:treasury', 'oddsound:payout-funds-used', -difference),
          })

        if (cost) {
          const { journal } = await import('./store')
          const { transfer } = await import('./domain')
          await journal(payload, session, {
            reference: `payout-fee-${p.reference}`,
            kind: 'payout_fee',
            postings: transfer('oddsound:treasury', 'wompi:payout-cost', cost),
            evidence: body.evidence,
          })
        }
        await model(payload, 'commercePayouts').updateOne(
          { _id: p._id },
          { $set: { actualFee: cost } },
          { session },
        )
        if (cost > (p.feeReserve || 0))
          await payload.db.globals.updateOne(
            { globalType: 'commerceSettings' },
            { $set: { reconciliationBlocked: true } },
            { session },
          )
        await audit(
          payload,
          actor,
          'payout_fee_reconciled',
          { reference: p.reference, cost, evidence: body.evidence },
          session,
        )
      })
    } else if (action === 'associatePayout') {
      if (!String(body.evidence || '').trim() || !String(body.providerID || '').trim())
        throw new CommerceError('Requiere ID y evidencia del proveedor.', 400)
      await model(payload, 'commercePayouts').updateOne(
        { reference: String(body.reference), state: { $in: ['unknown', 'submitting'] } },
        { $set: { providerID: String(body.providerID), state: 'pending' } },
      )
      await audit(payload, actor, 'payout_associated', {
        reference: body.reference,
        providerID: body.providerID,
        evidence: body.evidence,
      })
    } else if (action === 'journalCorrection') {
      if (!String(body.evidence || '').trim())
        throw new CommerceError('Motiva el asiento compensatorio.', 400)
      await financeTransaction(payload, async (session) => {
        const { journal } = await import('./store')
        await journal(payload, session, {
          reference: String(body.reference),
          kind: 'admin_correction',
          postings: body.postings,
          evidence: body.evidence,
        })
        await audit(
          payload,
          actor,
          'journal_correction',
          { reference: body.reference, evidence: body.evidence },
          session,
        )
      })
    } else if (action === 'reconcile')
      await reconcileOrder(payload, actor, orderID, integer(body.cost), String(body.evidence || ''))
    else if (action === 'verifyDelivery')
      await verifyDelivery(
        payload,
        actor,
        String(body.shipmentID),
        String(body.deliveredAt),
        String(body.evidence || ''),
      )
    else if (action === 'decideCase')
      await decideCase(payload, actor, caseID, {
        refund: integer(body.refund),
        sellerFault: body.sellerFault === true,
        decision: String(body.decision || ''),
      })
    else if (action === 'resolveShippingException') {
      if (!String(body.evidence || '').trim())
        throw new CommerceError('Se requiere evidencia de resolución.', 400)
      await financeTransaction(payload, async (session) => {
        const order = await model(payload, 'orders').findById(orderID).session(session).lean<any>()
        const active = await model(payload, 'commerceCases')
          .exists({ order: orderID, state: { $nin: ['resolved', 'dismissed'] } })
          .session(session)
        await model(payload, 'orders').updateOne(
          { _id: orderID },
          {
            $set: {
              'finance.shippingException': false,
              'finance.blocked': Boolean(active || order.finance.reversalPending),
            },
          },
          { session },
        )
        order.finance.shippingException = false
        if (!active && !order.finance.reversalPending) await releaseHold(payload, session, order)
        await audit(
          payload,
          actor,
          'shipping_exception_resolved',
          { orderID, evidence: body.evidence },
          session,
        )
      })
    } else if (action === 'recordChargeback')
      await recordChargeback(
        payload,
        actor,
        orderID,
        integer(body.amount, 1),
        String(body.reference || ''),
        String(body.evidence || ''),
      )
    else if (action === 'confirmRefund')
      await completeRefund(payload, actor, String(body.reference), String(body.evidence || ''))
    else if (action === 'configure') {
      const allowed = [
        'chargesEnabled',
        'payoutsEnabled',
        'productionApproved',
        'commissionConfirmed',
        'commissionPercent',
        'payoutWeekday',
        'payoutHour',
        'automaticPayoutsApproved',
        'refundsEnabled',
        'reconciliationBlocked',
        'ownRefundFundsInCents',
        'ownPayoutFundsInCents',
        'payoutFeeReserveInCents',
        'holidays',
      ]
      const data = Object.fromEntries(
        Object.entries(body.settings || {}).filter(([key]) => allowed.includes(key)),
      )
      await payload.updateGlobal({
        slug: 'commerceSettings',
        data,
        overrideAccess: false,
        user: user!,
      })
      await audit(payload, actor, 'settings_changed', data)
    } else if (action === 'attestBalance') {
      if (!String(body.evidence || '').trim())
        throw new CommerceError('Adjunta evidencia del saldo.', 400)
      await financeTransaction(payload, async (session) => {
        // Fold confirmed payouts into the external balance baseline exactly once.
        const paid = await model(payload, 'commercePayouts')
          .find({
            state: 'paid',
            actualFee: { $exists: true },
            cashReconciledAt: { $exists: false },
          })
          .session(session)
          .lean<any>()
        for (const p of paid) {
          const { journal } = await import('./store')
          const { transfer } = await import('./domain')
          await journal(payload, session, {
            reference: `${p.reference}-cash-observed`,
            kind: 'cash_reconciled',
            postings: transfer(
              'wompi:payout-reserved',
              'wompi:cash',
              p.amount + (p.feeReserve || 0),
            ),
            evidence: body.evidence,
          })
          await model(payload, 'commercePayouts').updateOne(
            { _id: p._id },
            { $set: { cashReconciledAt: new Date().toISOString() } },
            { session },
          )
        }
        await payload.db.globals.updateOne(
          { globalType: 'commerceSettings' },
          {
            $set: {
              observedAvailableInCents: integer(body.amount),
              balanceObservedAt: new Date().toISOString(),
              balanceEvidence: body.evidence,
            },
          },
          { session },
        )
        await audit(
          payload,
          actor,
          'balance_attested',
          { amount: body.amount, evidence: body.evidence },
          session,
        )
      })
    } else if (action === 'appeal') {
      if (!String(body.evidence || '').trim()) throw new CommerceError('Motiva la revisión.', 400)
      await financeTransaction(payload, async (session) => {
        await model(payload, 'profiles').updateOne(
          { _id: String(body.artist) },
          { $set: { 'commerce.salesBlocked': false } },
          { session },
        )
        await audit(
          payload,
          actor,
          'sales_block_reviewed',
          { artist: body.artist, evidence: body.evidence },
          session,
        )
      })
    } else throw new CommerceError('Acción desconocida.', 400)
    return reply({ ok: true })
  } catch (error) {
    return reply(
      {
        message:
          error instanceof CommerceError ? error.message : 'No se pudo completar la operación.',
      },
      error instanceof CommerceError ? error.status : 500,
    )
  }
}
