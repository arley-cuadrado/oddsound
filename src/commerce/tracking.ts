import { CARRIERS, CommerceError } from './domain'
import type { Payload } from 'payload'
import { model, account, balance, journal, touchOrder } from './store'
import { financeTransaction } from './service'
import { transfer } from './domain'

export const TRACKING_INTERVAL_MS = 4 * 3600000
export type TrackingEvent = {
  state: string
  at: string
  description: string
  location?: string
  estimatedDeliveryAt?: string
}
const states = ['registered', 'in_transit', 'exception', 'delivered', 'returned']

function allowedURL(raw: string, officialURL: string) {
  const url = new URL(raw),
    official = new URL(officialURL)
  const root = official.hostname.replace(/^www\./, '')
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !(url.hostname === root || url.hostname.endsWith(`.${root}`))
  )
    throw new CommerceError('El conector debe consultar el dominio oficial HTTPS.')
  return url
}

export function normalizeTracking(events: unknown): TrackingEvent[] {
  if (!Array.isArray(events) || !events.length || events.length > 200)
    throw new Error('Formato de tracking cambió o está vacío.')
  return events
    .map((event) => {
      if (
        !event ||
        !states.includes(event.state) ||
        !Number.isFinite(new Date(event.at).getTime()) ||
        new Date(event.at).getTime() > Date.now() + 300000 ||
        typeof event.description !== 'string'
      )
        throw new Error('Evento de tracking inválido.')
      return {
        state: event.state,
        at: new Date(event.at).toISOString(),
        description: event.description.slice(0, 1000),
        ...(typeof event.location === 'string' ? { location: event.location.slice(0, 200) } : {}),
        ...(typeof event.estimatedDeliveryAt === 'string' &&
        Number.isFinite(new Date(event.estimatedDeliveryAt).getTime())
          ? { estimatedDeliveryAt: new Date(event.estimatedDeliveryAt).toISOString() }
          : {}),
      }
    })
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

export async function seedCarriers(payload: Payload) {
  for (const c of CARRIERS)
    await model(payload, 'commerceCarriers').updateOne(
      { code: c.code },
      {
        $setOnInsert: {
          code: c.code,
          name: c.name,
          officialURL: c.url,
          apiEnabled: false,
          scrapingEnabled: false,
          assessment: {
            status: 'pending_authorized_tests',
            documentationChecked: true,
            automaticDeliveryVerification: false,
          },
        },
      },
      { upsert: true },
    )
}

async function apiTracking(config: any, shipment: any, official: string) {
  const url = allowedURL(
    String(config.url).replace('{guide}', encodeURIComponent(shipment.guide)),
    official,
  )
  const headers: Record<string, string> = {}
  for (const [name, env] of Object.entries(config.headerEnv || {})) {
    if (typeof env !== 'string' || !env.startsWith('TRACKING_') || !process.env[env])
      throw new Error('Credencial del conector ausente.')
    headers[name] = process.env[env]!
  }
  const result = await fetch(url, {
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  })
  if (!result.ok) throw new Error(`Tracking HTTP ${result.status}`)
  const raw = await result.text()
  if (raw.length > 1000000) throw new Error('Respuesta de tracking demasiado grande.')
  const root = JSON.parse(raw)
  let estimate = root
  if (config.estimatedDeliveryPath)
    for (const key of config.estimatedDeliveryPath.split('.')) estimate = estimate?.[key]
  else estimate = undefined
  let data = root
  for (const key of String(config.eventsPath || 'events').split('.')) data = data?.[key]
  // Explicit per-carrier mapping. No inference from an entire HTML page.
  return normalizeTracking(
    data?.map((e: any) => ({
      state: config.statusMap?.[e[config.statusKey || 'state']] || e[config.statusKey || 'state'],
      at: e[config.dateKey || 'at'],
      description: e[config.descriptionKey || 'description'],
      location: e[config.locationKey || 'location'],
      estimatedDeliveryAt: estimate,
    })),
  )
}

async function scrapeTracking(config: any, shipment: any, official: string) {
  const url = allowedURL(
    String(config.url).replace('{guide}', encodeURIComponent(shipment.guide)),
    official,
  )
  // Browser exists only in the worker image. No automatic CAPTCHA solving.
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' })
    await context.route('**/*', async (route) => {
      try {
        allowedURL(route.request().url(), official)
        await route.continue()
      } catch {
        await route.abort()
      }
    })
    const page = await context.newPage()
    page.setDefaultTimeout(12000)
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 20000 })
    if (config.inputSelector) {
      await page.locator(config.inputSelector).fill(shipment.guide)
      await page.locator(config.submitSelector).click()
    }
    if (await page.locator('iframe[src*="captcha"], .g-recaptcha, .h-captcha').count())
      throw new Error('Consulta requiere verificación humana.')
    const rows = page.locator(config.rowSelector)
    await rows.first().waitFor()
    const events = []
    for (const row of await rows.all())
      events.push({
        state: config.statusMap?.[(await row.locator(config.statusSelector).innerText()).trim()],
        at: (await row.locator(config.dateSelector).innerText()).trim(),
        description: (await row.locator(config.descriptionSelector).innerText()).trim(),
      })
    return normalizeTracking(events)
  } finally {
    await browser.close()
  }
}

export async function pollTracking(
  payload: Payload,
  shipment: any,
  drivers = { api: apiTracking, scraping: scrapeTracking },
) {
  const carrier = await model(payload, 'commerceCarriers')
    .findOne({ code: shipment.carrier })
    .lean<any>()
  if (!carrier || (!carrier.apiEnabled && !carrier.scrapingEnabled)) {
    await model(payload, 'commerceShipments').updateOne(
      { _id: shipment._id },
      {
        $set: {
          source: 'external',
          nextCheckAt: new Date(Date.now() + TRACKING_INTERVAL_MS).toISOString(),
          error: 'Consulta automática no habilitada; revisión y enlace oficial disponibles.',
        },
      },
    )
    return
  }
  let events: TrackingEvent[] | undefined,
    source = 'api',
    lastError: unknown
  if (carrier.apiEnabled)
    try {
      events = await drivers.api(carrier.apiConfig, shipment, carrier.officialURL)
    } catch (error) {
      lastError = error
    }
  if (!events && carrier.scrapingEnabled)
    try {
      events = await drivers.scraping(carrier.scrapingConfig, shipment, carrier.officialURL)
      source = 'scraping'
    } catch (error) {
      lastError = error
    }
  if (!events) {
    const failures = (shipment.failures || 0) + 1
    await model(payload, 'commerceShipments').updateOne(
      { _id: shipment._id },
      {
        $set: {
          failures,
          error: lastError instanceof Error ? lastError.message : 'No se pudo consultar.',
          lastCheckedAt: new Date().toISOString(),
          nextCheckAt: new Date(
            Date.now() + Math.min(86400000, TRACKING_INTERVAL_MS * 2 ** failures),
          ).toISOString(),
        },
      },
    )
    return
  }
  const latest = events.at(-1)!
  if (['exception', 'returned'].includes(latest.state))
    await financeTransaction(payload, async (session) => {
      const order = await model(payload, 'orders')
        .findById(shipment.order)
        .session(session)
        .lean<any>()
      if (!order?.finance) return
      for (const bucket of ['pending', 'available']) {
        const value = await balance(
          payload,
          account(shipment.artist, shipment.order, bucket),
          session,
        )
        if (value > 0)
          await journal(payload, session, {
            reference: `tracking-hold-${shipment._id}-${latest.at}-${bucket}`,
            artist: shipment.artist,
            order: shipment.order,
            kind: 'shipping_hold',
            postings: transfer(
              account(shipment.artist, shipment.order, bucket),
              account(shipment.artist, shipment.order, 'held'),
              value,
            ),
          })
      }
      await touchOrder(
        payload,
        shipment.order,
        { 'finance.blocked': true, 'finance.shippingException': true },
        session,
      )
    })
  // External delivered status is evidence to review, never permission to pay.
  await model(payload, 'commerceShipments').updateOne(
    { _id: shipment._id },
    {
      $set: {
        history: events,
        ...(latest.estimatedDeliveryAt ? { estimatedDeliveryAt: latest.estimatedDeliveryAt } : {}),
        state: latest.state,
        source,
        error: '',
        failures: 0,
        lastCheckedAt: new Date().toISOString(),
        nextCheckAt: new Date(Date.now() + TRACKING_INTERVAL_MS).toISOString(),
      },
    },
  )
}
