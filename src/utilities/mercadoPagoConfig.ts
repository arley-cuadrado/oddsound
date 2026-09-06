import { getServerSideURL } from './getURL'

export const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com'
export const MERCADO_PAGO_AUTH_URL = 'https://auth.mercadopago.com/authorization'
export const MERCADO_PAGO_OAUTH_TOKEN_URL = `${MERCADO_PAGO_API_BASE}/oauth/token`
export const MERCADO_PAGO_USER_INFO_URL = 'https://api.mercadolibre.com/users/me'

/**
 * Credentials of the oddsound marketplace application, created once at
 * https://www.mercadopago.com.co/developers/panel/app with solution "Pagos
 * online", product "Checkout Pro" and integration model "Marketplace".
 *
 * The redirect URI must match the panel exactly — Mercado Pago rejects the
 * authorisation otherwise, which is why extra state travels in `state`.
 */
export function getMercadoPagoOAuthConfig() {
  const clientID = process.env.MERCADOPAGO_CLIENT_ID || ''
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET || ''

  if (!clientID || !clientSecret) {
    throw new Error('Missing Mercado Pago OAuth credentials.')
  }

  return {
    clientID,
    clientSecret,
    redirectURI: `${getServerSideURL()}/creator-api/payments/connect/callback`,
  }
}
