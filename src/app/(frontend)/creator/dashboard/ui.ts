/**
 * Shared surfaces for the artist panel.
 *
 * Everything here goes through theme tokens rather than literal colours. The
 * page used to hardcode a cream gradient and white cards, which left dark mode
 * unreadable — white text on a light background — and, in light mode, cards that
 * were the same value as the page behind them.
 */
export const panelCard = 'rounded-2xl border border-border bg-card p-6'

/** A block nested inside a card. One step back toward the page colour, which is
 *  what creates depth in both themes. */
export const panelInset = 'rounded-xl border border-border bg-background p-4'

export const panelEyebrow =
  'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'

export const panelTitle = 'text-lg font-medium tracking-tight text-foreground'

export const panelBody = 'text-[13px] leading-6 text-muted-foreground'

export const primaryButton =
  'inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-[13px] font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60'

export const secondaryButton =
  'inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-[13px] font-medium text-foreground transition hover:bg-muted disabled:opacity-60'

export const chip = 'rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground'

/** Status tones. Tailwind's palette already carries both themes. */
export const tone = {
  alert: 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40',
  alertText: 'text-rose-700 dark:text-rose-300',
  ok: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40',
  okText: 'text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40',
  warnText: 'text-amber-700 dark:text-amber-300',
} as const
