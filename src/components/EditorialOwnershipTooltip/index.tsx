'use client'

import { useEffect, useRef, useState } from 'react'

const OWNERSHIP_COPY =
  'El editor es dueño de su artículo, oddosund como plataforma editorial presta su uso en colaboración.'

export default function EditorialOwnershipTooltip() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="relative inline-flex"
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false)
        }
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        aria-expanded={open}
        aria-label="Ver nota editorial"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-medium text-[#777] transition-opacity hover:opacity-70 dark:text-[#858c98]"
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setOpen(true)}
        type="button"
      >
        i
      </button>

      {open ? (
        <div
          className="absolute left-1/2 top-[calc(100%+10px)] z-20 w-[240px] -translate-x-1/2 rounded-2xl bg-[#1f2a44] px-4 py-3 text-left text-[10px] leading-4 text-white shadow-lg"
          role="tooltip"
        >
          <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#1f2a44]" />
          {OWNERSHIP_COPY}
        </div>
      ) : null}
    </div>
  )
}
