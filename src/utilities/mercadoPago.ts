import { getServerSideURL } from './getURL'

const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com'
const MERCADO_PAGO_OAUTH_BASE = 'https://auth.mercadopago.com/authorization'

export function getMercadoPagoConfig() {
  return {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
    clientID: process.env.MERCADOPAGO_CLIENT_ID || '',
    clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET || '',
    publicKey: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
  }
}

export function getMercadoPagoCallbackURL() {
  return `${getServerSideURL()}/creator-api/payments/connect/callback`
}

export function buildMercadoPagoOAuthURL(state: string) {
  const { clientID } = getMercadoPagoConfig()

  if (!clientID) {
    throw new Error('Missing MERCADOPAGO_CLIENT_ID.')
  }

  const params = new URLSearchParams({
    client_id: clientID,
    redirect_uri: getMercadoPagoCallbackURL(),
    response_type: 'code',
    state,
  })

  return `${MERCADO_PAGO_OAUTH_BASE}?${params.toString()}`
}

async function mercadoPagoRequest<T>({
  accessToken,
  body,
  method = 'GET',
  path,
}: {
  accessToken: string
  body?: Record<string, unknown>
  method?: 'GET' | 'POST'
  path: string
}): Promise<T> {
  const response = await fetch(`${MERCADO_PAGO_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Mercado Pago request failed (${response.status}): ${message}`)
  }

  return response.json() as Promise<T>
}

export async function exchangeMercadoPagoCode(code: string) {
  const { clientID, clientSecret } = getMercadoPagoConfig()

  if (!clientID || !clientSecret) {
    throw new Error('Missing Mercado Pago OAuth credentials.')
  }

  const response = await fetch(`${MERCADO_PAGO_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientID,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: getMercadoPagoCallbackURL(),
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Mercado Pago OAuth failed (${response.status}): ${message}`)
  }

  return response.json() as Promise<{
    access_token: string
    expires_in?: number
    refresh_token?: string
    scope?: string
    user_id?: number | string
  }>
}

export async function getMercadoPagoSeller(accessToken: string) {
  return mercadoPagoRequest<{
    email?: string
    id?: number | string
    nickname?: string
    status?: string
  }>({
    accessToken,
    path: '/users/me',
  })
}

export async function createMercadoPagoPreference({
  accessToken,
  payload,
}: {
  accessToken: string
  payload: Record<string, unknown>
}) {
  return mercadoPagoRequest<{
    id?: string
    init_point?: string
    sandbox_init_point?: string
  }>({
    accessToken,
    body: payload,
    method: 'POST',
    path: '/checkout/preferences',
  })
}

export async function getMercadoPagoPayment({
  accessToken,
  paymentID,
}: {
  accessToken: string
  paymentID: string
}) {
  return mercadoPagoRequest<{
    id?: number | string
    status?: string
    status_detail?: string
    transaction_amount?: number
    external_reference?: string
    fee_details?: Array<{
      amount?: number
      type?: string
    }>
  }>({
    accessToken,
    path: `/v1/payments/${paymentID}`,
  })
}
