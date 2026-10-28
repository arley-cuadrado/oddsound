import type { Profile } from '@/payload-types'

import type { ConnectionHealth } from './mercadoPagoTokens'

export const MERCADO_PAGO_CONNECT_PATH = '/creator/dashboard#commerce-operations'

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
  const connected = Boolean(profile?.commerce?.bankVerified && !profile?.commerce?.salesBlocked)
  const needsReconnect = false
  const health: ConnectionHealth = {
    state: connected ? 'connected' : 'not_connected',
    daysRemaining: null,
    lifetimeRatio: connected ? 1 : 0,
  }
  const shippingRate = profile?.commerce?.shippingFlatRateCOP

  const steps: MerchOnboardingStep[] = [
    {
      action: connected ? null : MERCADO_PAGO_CONNECT_PATH,
      actionLabel: 'Registrar o verificar cuenta bancaria',
      detail: profile?.commerce?.salesBlocked
        ? 'Nuevas ventas bloqueadas; revisa tus reclamos.'
        : connected
          ? 'Cuenta bancaria verificada'
          : 'Registra y verifica tu cuenta bancaria.',
      done: connected,
      key: 'connect',
      title: 'Verifica tu cuenta bancaria',
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
