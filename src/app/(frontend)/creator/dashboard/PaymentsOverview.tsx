import Link from 'next/link'

type SellerAccountSummary = {
  accountStatus?: null | string
  canReceivePayments?: boolean
  id?: null | string
  kycStatus?: null | string
  lastError?: null | string
  oauthConnectedAt?: null | string
  provider?: null | string
  providerSellerEmail?: null | string
  providerSellerNickname?: null | string
}

type PaymentsOverviewProps = {
  platformFeePercent: number
  sellerAccount: null | SellerAccountSummary
}

function getStatusCopy(account: null | SellerAccountSummary) {
  if (!account) {
    return {
      description:
        'Todavia no has conectado una cuenta de cobro. Este paso habilita el split automatico para que Oddsound cobre su fee y el saldo viaje a tu cuenta conectada.',
      title: 'Cuenta de cobro pendiente',
    }
  }

  if (account.canReceivePayments && account.accountStatus === 'connected') {
    return {
      description:
        'Tu cuenta conectada ya puede recibir pagos del marketplace. Desde aqui puedes seguir el estado de onboarding y usar checkout nativo en tus productos.',
      title: 'Cuenta conectada',
    }
  }

  return {
    description:
      account.lastError ||
      'Tu cuenta existe, pero aun no esta lista para cobrar. Revisa el onboarding de Mercado Pago y vuelve a conectar si hace falta.',
    title: 'Cuenta en revision',
  }
}

export function PaymentsOverview({ platformFeePercent, sellerAccount }: PaymentsOverviewProps) {
  const statusCopy = getStatusCopy(sellerAccount)

  return (
    <section className="space-y-6 rounded-[28px] border border-border/70 bg-white/70 p-6 shadow-[0_18px_60px_rgba(49,46,46,0.08)] backdrop-blur">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/55">
          Marketplace Payments
        </p>
        <h2 className="text-xl font-medium text-foreground">{statusCopy.title}</h2>
        <p className="max-w-[46rem] text-[13px] leading-6 text-foreground/75">
          {statusCopy.description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border/70 bg-background px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/55">Proveedor</p>
          <p className="mt-2 text-lg font-medium text-foreground">
            {sellerAccount?.provider || 'mercadopago'}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-background px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/55">Fee Oddsound</p>
          <p className="mt-2 text-lg font-medium text-foreground">{platformFeePercent}%</p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-background px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/55">KYC</p>
          <p className="mt-2 text-lg font-medium text-foreground">
            {sellerAccount?.kycStatus || 'unknown'}
          </p>
        </article>
      </div>

      <div className="flex flex-wrap gap-3 text-[12px] text-foreground/72">
        {sellerAccount?.providerSellerNickname ? (
          <span className="rounded-full bg-[#f4efe6] px-3 py-1.5 text-foreground/80">
            Cuenta: {sellerAccount.providerSellerNickname}
          </span>
        ) : null}
        {sellerAccount?.providerSellerEmail ? (
          <span className="rounded-full bg-[#f4efe6] px-3 py-1.5 text-foreground/80">
            {sellerAccount.providerSellerEmail}
          </span>
        ) : null}
        <span className="rounded-full bg-[#f4efe6] px-3 py-1.5 text-foreground/80">
          Cobros habilitados: {sellerAccount?.canReceivePayments ? 'si' : 'no'}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#312e2e] px-5 text-[13px] font-medium text-white"
          href="/creator-api/payments/connect/start"
        >
          {sellerAccount?.accountStatus === 'connected' ? 'Reconectar Mercado Pago' : 'Conectar Mercado Pago'}
        </Link>
        {sellerAccount?.id ? (
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-[13px] font-medium text-foreground transition hover:bg-[#f3efe8]"
            href={`/dashboard/collections/seller-payment-accounts/${sellerAccount.id}`}
          >
            Abrir configuracion de cobros
          </Link>
        ) : null}
      </div>
    </section>
  )
}
