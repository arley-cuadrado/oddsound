// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { pollTracking } from '@/commerce/tracking'
function fixture(carrier: Record<string, unknown>) {
  const updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })
  const payload = {
    db: {
      collections: {
        commerceCarriers: { findOne: () => ({ lean: () => carrier }) },
        commerceShipments: { updateOne },
      },
    },
  } as unknown as Payload
  return { payload, updateOne }
}
const shipment = {
  _id: 's1',
  carrier: 'coordinadora',
  guide: '123456',
  state: 'in_transit',
  history: [{ description: 'Cached event' }],
}
const events = [{ state: 'in_transit', at: '2026-01-01T12:00:00Z', description: 'En camino' }]
describe('tracking recovery', () => {
  it('falls back to the independently enabled scraper when API fails', async () => {
    const { payload, updateOne } = fixture({
      apiEnabled: true,
      scrapingEnabled: true,
      officialURL: 'https://coordinadora.com',
    })
    const drivers = {
      api: vi.fn().mockRejectedValue(new Error('API unavailable')),
      scraping: vi.fn().mockResolvedValue(events),
    }
    await pollTracking(payload, shipment, drivers)
    expect(drivers.scraping).toHaveBeenCalledOnce()
    expect(updateOne.mock.calls[0][1].$set).toMatchObject({
      source: 'scraping',
      history: events,
      state: 'in_transit',
    })
    expect(updateOne.mock.calls[0][1].$set).not.toHaveProperty('verifiedAt')
  })
  it('preserves cached history and delivery evidence when both sources fail', async () => {
    const { payload, updateOne } = fixture({ apiEnabled: true, scrapingEnabled: true })
    await pollTracking(payload, shipment, {
      api: vi.fn().mockRejectedValue(new Error('503')),
      scraping: vi.fn().mockRejectedValue(new Error('CAPTCHA')),
    })
    expect(updateOne.mock.calls[0][1].$set).toMatchObject({ failures: 1, error: 'CAPTCHA' })
    expect(updateOne.mock.calls[0][1].$set).not.toHaveProperty('history')
    expect(updateOne.mock.calls[0][1].$set).not.toHaveProperty('state')
  })
  it('does not run unapproved connectors', async () => {
    const { payload, updateOne } = fixture({ apiEnabled: false, scrapingEnabled: false })
    const drivers = { api: vi.fn(), scraping: vi.fn() }
    await pollTracking(payload, shipment, drivers)
    expect(drivers.api).not.toHaveBeenCalled()
    expect(drivers.scraping).not.toHaveBeenCalled()
    expect(updateOne.mock.calls[0][1].$set.source).toBe('external')
  })
})
