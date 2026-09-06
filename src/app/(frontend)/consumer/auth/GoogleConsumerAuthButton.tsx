'use client'

type Props = {
  disabled?: boolean
  href?: string
  label: string
}

export function GoogleConsumerAuthButton({
  disabled = false,
  href = '/consumer-api/auth/google/start',
  label,
}: Props) {
  return (
    <a
      aria-disabled={disabled}
      className={`mt-2 inline-flex h-12 w-full items-center justify-center px-4 text-[13px] font-medium transition ${
        disabled
          ? 'cursor-not-allowed bg-[#8c8585] text-white/85'
          : 'bg-[#312e2e] text-white hover:opacity-90'
      }`}
      href={disabled ? undefined : href}
      onClick={disabled ? (event) => event.preventDefault() : undefined}
    >
      {label}
    </a>
  )
}
