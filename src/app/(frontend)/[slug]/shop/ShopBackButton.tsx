'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  fallbackHref: string
}

export function ShopBackButton({ fallbackHref }: Props) {
  const router = useRouter()

  return (
    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#777] dark:text-[#858c98]">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            router.back()
            return
          }

          router.push(fallbackHref)
        }}
        className="inline-flex items-center transition hover:text-slate-900 dark:hover:text-white"
        aria-label="Volver atrás"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" />
      </button>
      <span>Shop</span>
    </div>
  )
}
