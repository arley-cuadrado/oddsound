import type { Profile } from '@/payload-types'

import { type ConnectionHealth, describeConnectionHealth } from './mercadoPagoTokens'

export const MERCADO_PAGO_CONNECT_PATH = '/creator-api/payments/connect/start'

export type MerchOnboardingStepKey = 'connect' | 'product' | 'shipping'

export type MerchOnboardingStep = {
  /** Where the artist goes to resolve this step, or null once it is done. */
  action: null | string
  actionLabel: string
  detail: string
  done: boolean
  key: MerchOnboardingStepKey
  title: string
}

export type MerchOnboarding = {
  health: ConnectionHealth
  /** True when the artist has to re-authorise before they can sell again. */
  needsReconnect: boolean
  nextStep: MerchOnboardingStep | null
  ready: boolean
  steps: MerchOnboardingStep[]
}

/**
 * The three things an artist must do before their merch can be bought, in order.
 *
 * Shared between the Payload admin and the public creator dashboard so the two
 * can never disagree about what is still pending — they render very differently,
 * but they answer the same question.
 */
export function getMerchOnboarding({
  hasPublishedProduct,
  profile,
}: {
  hasPublishedProduct: boolean
  profile: null | Profile | undefined
}): MerchOnboarding {
  const connection = profile?.mercadoPagoConnection
  const health = describeConnectionHealth(profile)
  const needsReconnect = health.state === 'action_required' || health.state === 'expired'
  const connected = connection?.status === 'connected' && !needsReconnect
  const shippingRate = profile?.commerce?.shippingFlatRateCOP

  const steps: MerchOnboardingStep[] = [
    {
      action: connected ? null : MERCADO_PAGO_CONNECT_PATH,
      actionLabel: needsReconnect
        ? 'Reconectar Mercado Pago'
        : connection?.status === 'connecting'
          ? 'Continuar la conexión'
          : 'Conectar Mercado Pago',
      detail: connected
        ? connection?.sellerEmail || 'Cuenta vinculada'
        : needsReconnect
          ? 'Tu autorización dejó de funcionar.'
          : 'Autorizas en Mercado Pago.',
      done: connected,
      key: 'connect',
      title: 'Conecta tu cuenta',
    },
    {
      action: '/dashboard/collections/profiles',
      actionLabel: 'Definir envío',
      detail:
        typeof shippingRate === 'number'
          ? shippingRate > 0
            ? 'Tarifa configurada'
            : 'Envío gratis'
          : 'Una tarifa por pedido. Puede ser 0.',
      // Zero is a real answer — free shipping — so only an unset field is pending.
      done: typeof shippingRate === 'number',
      key: 'shipping',
      title: 'Configura el envío',
    },
    {
      action: '/dashboard/collections/products',
      actionLabel: 'Crear producto',
      detail: hasPublishedProduct ? 'Ya tienes merch publicado' : 'Aún no tienes merch a la venta.',
      done: hasPublishedProduct,
      key: 'product',
      title: 'Publica tu merch',
    },
  ]

  const nextStep = steps.find((step) => !step.done) || null

  return {
    health,
    needsReconnect,
    nextStep,
    ready: nextStep === null,
    steps,
  }
}
