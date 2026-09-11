import type { CurrenciesConfig, Currency } from '@payloadcms/plugin-ecommerce/types'

/**
 * Colombian peso.
 *
 * `decimals: 0` is not a display preference. The ecommerce plugin stores every
 * amount in minor units, so with zero decimals a stored unit *is* a peso — which
 * is also what Mercado Pago expects for COP, a currency with no cents in
 * practice. Getting this wrong is a factor-of-100 charge, so it lives here alone
 * and everything else reads it.
 */
export const COP: Currency = {
  code: 'COP',
  decimals: 0,
  label: 'Peso colombiano',
  symbol: '$',
}

export const currenciesConfig: CurrenciesConfig = {
  defaultCurrency: COP.code,
  supportedCurrencies: [COP],
}
