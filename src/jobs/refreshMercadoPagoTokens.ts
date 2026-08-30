import type { TaskConfig } from 'payload'

import {
  findConnectionsDueForRefresh,
  MercadoPagoReconnectRequiredError,
  refreshMercadoPagoConnection,
} from '@/utilities/mercadoPagoTokens'

export type RefreshMercadoPagoTokensOutput = {
  checked: number
  failed: number
  needsReconnect: number
  refreshed: number
}

/**
 * Keeps every artist's Mercado Pago credentials alive.
 *
 * Tokens live 180 days and are renewed once they are a month old, so five
 * consecutive missed runs still leave the connection working. Failures are
 * recorded on the profile rather than thrown, because one broken artist must not
 * stop the job from renewing everybody else.
 */
export const refreshMercadoPagoTokensTask: TaskConfig<{
  input: Record<string, never>
  output: RefreshMercadoPagoTokensOutput
}> = {
  slug: 'refresh-mercadopago-tokens',
  handler: async ({ req }) => {
    const { payload } = req
    const due = await findConnectionsDueForRefresh(payload)

    const output: RefreshMercadoPagoTokensOutput = {
      checked: due.length,
      failed: 0,
      needsReconnect: 0,
      refreshed: 0,
    }

    for (const profile of due) {
      try {
        await refreshMercadoPagoConnection({ payload, profileID: String(profile.id) })
        output.refreshed += 1
      } catch (error) {
        if (error instanceof MercadoPagoReconnectRequiredError) {
          output.needsReconnect += 1
        } else {
          output.failed += 1
        }

        payload.logger.warn(
          `[mercadopago] no se pudo renovar el token del perfil ${String(profile.id)}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }

    return { output }
  },
  label: 'Renovar tokens de Mercado Pago',
  outputSchema: [
    { name: 'checked', type: 'number' },
    { name: 'refreshed', type: 'number' },
    { name: 'needsReconnect', type: 'number' },
    { name: 'failed', type: 'number' },
  ],
  // Seconds, minutes, hours: 04:00 every day.
  schedule: [{ cron: '0 0 4 * * *', queue: 'default' }],
}
