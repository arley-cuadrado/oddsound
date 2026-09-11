'use client'

import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'
import { useCartSummary } from './useCartSummary'

const MAX_VISIBLE_AVATARS = 3

/**
 * The cart entry point in the header.
 *
 * It shows the artist faces stacked next to the item count, so a shopper can see
 * that their cart spans more than one seller — and therefore more than one
 * payment — before they ever open it.
 */
export const CartBadge: React.FC<{ className?: string }> = ({ className }) => {
  const { summary } = useCartSummary()

  if (summary.itemCount === 0) return null

  const visible = summary.groups.slice(0, MAX_VISIBLE_AVATARS)
  const overflow = summary.groups.length - visible.length

  return (
    <Link
      aria-label={`Carrito: ${summary.itemCount} ${summary.itemCount === 1 ? 'producto' : 'productos'} de ${summary.artistCount} ${summary.artistCount === 1 ? 'artista' : 'artistas'}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-3 pr-2 text-[12px] font-medium text-foreground transition hover:bg-muted',
        className,
      )}
      href="/cart"
    >
      <BagIcon />
      <span className="tabular-nums">{summary.itemCount}</span>

      <span aria-hidden="true" className="flex items-center -space-x-2">
        {visible.map((group) => (
          <span
            className="grid size-6 place-items-center overflow-hidden rounded-full border border-background bg-muted text-[10px] font-semibold uppercase text-muted-foreground"
            key={group.profileID || group.profileName}
            title={group.profileName}
          >
            {group.avatarURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="size-full object-cover" src={group.avatarURL} />
            ) : (
              group.profileName.slice(0, 1)
            )}
          </span>
        ))}
        {overflow > 0 ? (
          <span className="grid size-6 place-items-center rounded-full border border-background bg-primary text-[10px] font-semibold text-primary-foreground">
            +{overflow}
          </span>
        ) : null}
      </span>
    </Link>
  )
}

function BagIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="15" viewBox="0 0 16 16" width="15">
      <path
        d="M3.4 5.5h9.2l-.8 8a1 1 0 0 1-1 .9H5.2a1 1 0 0 1-1-.9l-.8-8ZM5.8 5.5V4a2.2 2.2 0 0 1 4.4 0v1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </svg>
  )
}
