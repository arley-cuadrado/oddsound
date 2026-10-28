import { expect, test } from '@playwright/test'
const fixture = {
  nextPayout: '2026-11-04T14:00:00Z',
  carriers: [],
  bank: null,
  payouts: [],
  orders: [
    {
      id: 'order-1',
      status: 'completed',
      fulfillmentStatus: 'shipped',
      total: 100000,
      commission: 12000,
      processorCost: 3000,
      finance: {
        buckets: { pending: 8500000, held: 0, available: 0, in_transit: 0, paid: 0 },
        paidAt: '2026-10-01T12:00:00Z',
        dispatchBy: '2026-10-08T12:00:00Z',
      },
      items: [{ product: 'lp', title: 'LP', quantity: 1 }],
      shipments: [
        {
          id: 's1',
          carrier: 'coordinadora',
          guide: '12345678',
          state: 'in_transit',
          link: 'https://rastreo.coordinadora.com/?guia=12345678',
          history: [{ at: '2026-10-02T12:00:00Z', description: 'Recibido por la transportadora' }],
          lastCheckedAt: '2026-10-02T14:00:00Z',
        },
      ],
      cases: [],
    },
  ],
}

test('buyer can see tracking, validate their guide and open a claim', async ({ page }) => {
  let opened: Record<string, unknown> | undefined
  await page.route('**/creator-api/commerce/operations**', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      opened = request.postDataJSON()
      await route.fulfill({ json: { caseID: 'case-1' } })
    } else await route.fulfill({ json: fixture })
  })
  await page.goto('http://localhost:3000/shop/orders?order=order-1')
  await expect(page.getByRole('heading', { name: /Pedido order-1/ })).toBeVisible()
  await expect(page.getByText('Recibido por la transportadora')).toBeVisible()
  await page.getByLabel('Consultar una guía de este pedido').fill('wrong-guide')
  await expect(page.getByText('La guía no corresponde a este pedido.')).toBeVisible()
  await page.getByLabel('Consultar una guía de este pedido').fill('12345678')
  await expect(page.getByText(/Última actualización/)).toBeVisible()
  await page.screenshot({ path: 'test-results/commerce-buyer.png', fullPage: true })
  await page.getByText('Abrir un reclamo formal', { exact: true }).click()
  await page.getByLabel('Importe reclamado (COP)').fill('100000')
  await page
    .getByLabel('Describe el problema y los productos afectados')
    .fill('El paquete no llegó.')
  await page.getByRole('button', { name: 'Abrir reclamo' }).click()
  await expect.poll(() => opened?.action).toBe('openCase')
  expect(opened?.amount).toBe(10000000)
})

test('email access token is exchanged and removed from browser URL', async ({ page }) => {
  let verified = false
  await page.route('**/creator-api/commerce/operations**', async (route) => {
    if (route.request().method() === 'POST') {
      verified = route.request().postDataJSON().action === 'guestVerify'
      await route.fulfill({ json: { ok: true } })
    } else await route.fulfill({ json: fixture })
  })
  await page.goto('http://localhost:3000/shop/orders?order=order-1#token=test-email-token')
  await expect.poll(() => verified).toBe(true)
  await expect(page).toHaveURL(/order=order-1$/)
  await expect(page.getByRole('heading', { name: /Pedido order-1/ })).toBeVisible()
})
