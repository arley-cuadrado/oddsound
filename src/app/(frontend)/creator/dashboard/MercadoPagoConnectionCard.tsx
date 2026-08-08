import Link from 'next/link'

type MercadoPagoConnectionCardProps = {
  connection: {
    accessTokenExpiresAt?: null | string
    lastConnectedAt?: null | string
    lastError?: null | string
    sellerEmail?: null | string
    sellerNickname?: null | string
    status: string
  }
}

const statusCopy = {
  action_required: {
    badge: 'Action required',
    helper:
      'Necesitamos que completes o repitas la autorizacion en Mercado Pago para que Oddsound pueda cobrar su fee automaticamente en cada venta.',
    label: 'Reconectar Mercado Pago',
  },
  connected: {
    badge: 'Connected',
    helper:
      'Tu cuenta ya esta vinculada. Cuando activemos el checkout de Mercado Pago, el split oficial podra cobrar el fee de Oddsound automaticamente.',
    label: 'Reconectar Mercado Pago',
  },
  connecting: {
    badge: 'Connecting',
    helper:
      'Tu autorizacion esta en curso. Si abriste Mercado Pago en otra pestana, vuelve aqui cuando completes el flujo.',
    label: 'Continuar conexion',
  },
  not_connected: {
    badge: 'Not connected',
    helper:
      'Conecta tu cuenta con un solo paso. Si ya tienes Mercado Pago, solo autorizas; si no, podras registrarte y volver listo.',
    label: 'Conectar Mercado Pago',
  },
} as const

function formatDate(value: null | string | undefined) {
  if (!value) return null

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function MercadoPagoConnectionCard({ connection }: MercadoPagoConnectionCardProps) {
  const copy = statusCopy[connection.status as keyof typeof statusCopy] || statusCopy.not_connected
  const connectedAt = formatDate(connection.lastConnectedAt)
  const expiresAt = formatDate(connection.accessTokenExpiresAt)

  return (
    <section className="space-y-5 rounded-[28px] border border-border/70 bg-white/70 p-6 shadow-[0_18px_60px_rgba(49,46,46,0.08)] backdrop-blur">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/55">
          Mercado Pago
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-medium text-foreground">Conexion de cobros del artista</h2>
          <span className="rounded-full bg-[#f4efe6] px-3 py-1 text-[11px] font-medium text-foreground/75">
            {copy.badge}
          </span>
        </div>
        <p className="max-w-[48rem] text-[13px] leading-6 text-foreground/75">{copy.helper}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border/70 bg-background px-4 py-4 text-[12px] text-foreground/75">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/55">Cuenta</p>
          <p className="mt-2 font-medium text-foreground">
            {connection.sellerEmail || 'Aun no conectada'}
          </p>
          {connection.sellerNickname ? <p className="mt-1">{connection.sellerNickname}</p> : null}
        </article>
        <article className="rounded-2xl border border-border/70 bg-background px-4 py-4 text-[12px] text-foreground/75">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/55">Ultima conexion</p>
          <p className="mt-2 font-medium text-foreground">{connectedAt || 'Sin registro'}</p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-background px-4 py-4 text-[12px] text-foreground/75">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/55">Expiracion token</p>
          <p className="mt-2 font-medium text-foreground">{expiresAt || 'Pendiente'}</p>
        </article>
      </div>

      {connection.lastError ? (
        <div className="rounded-2xl border border-[#d8b9b9] bg-[#fff5f5] px-4 py-4 text-[12px] leading-5 text-[#7b3d3d]">
          {connection.lastError}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[18px] bg-[#312e2e] px-5 text-[13px] font-medium text-white"
          href="/creator-api/payments/connect/start"
        >
          {copy.label}
        </Link>
      </div>
    </section>
  )
}
