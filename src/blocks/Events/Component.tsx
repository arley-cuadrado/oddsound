import React from 'react'

import type { EventsBlock as EventsBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/ui'

function formatEventDateParts(timestamp: string) {
  const value = timestamp ? new Date(timestamp) : new Date()

  return {
    day: value.getDate().toString().padStart(2, '0'),
    month: value.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
  }
}

type Props = EventsBlockProps & {
  disableInnerContainer?: boolean
}

export const EventsBlock: React.FC<Props> = (props) => {
  const { disableInnerContainer, events, title } = props

  if (!events?.length) return null

  return (
    <section className={cn('my-8', { container: !disableInnerContainer })}>
      <div className="space-y-6">
        {title ? <h2 className="text-3xl font-semibold tracking-tight">{title}</h2> : null}

        <div className="grid gap-0">
          {events.map((event, index) => {
            const { city, date, enableTicketLink, ticketLink, venue } = event
            const { day, month } = formatEventDateParts(date)
            const ticketLinkLabel =
              (ticketLink as { label?: null | string } | null | undefined)?.label ||
              'Comprar entradas'

            return (
              <article className="bg-transparent px-5 shadow-none" key={index}>
                <div className="flex flex-col gap-6 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)] items-start gap-5 md:gap-8 lg:grid-cols-[52px_minmax(0,140px)_minmax(0,220px)]">
                    <div className="w-[52px]">
                      <div className="flex w-[52px] flex-col overflow-hidden rounded-[4px] border border-border text-center">
                        <span className="h-[18px] bg-black px-2 text-[10px] font-semibold leading-[18px] uppercase tracking-[0.16em] text-white">
                          {month}
                        </span>
                        <span className="h-[40px] bg-transparent text-[24px] leading-[40px] text-slate-950 dark:text-white">
                          {day}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="flex h-[18px] items-center text-[11px] font-medium uppercase tracking-[0.18em] text-[#777] dark:text-[#858c98]">
                        Ciudad
                      </p>
                      <p className="flex h-[40px] items-center text-[18px] font-semibold leading-tight text-[#777] dark:text-[#858c98]">
                        {city}
                      </p>
                    </div>

                    <div>
                      <p className="flex h-[18px] items-center justify-end text-[11px] font-medium uppercase tracking-[0.18em] text-[#777] dark:text-[#858c98]">
                        Lugar
                      </p>
                      <p className="flex h-[40px] items-center justify-end text-[18px] font-semibold leading-tight text-[#777] dark:text-[#858c98]">
                        {venue}
                      </p>
                    </div>
                  </div>

                  {enableTicketLink ? (
                    <CMSLink
                      {...ticketLink}
                      appearance={ticketLink?.appearance ?? 'default'}
                      className="w-full justify-center lg:mt-2 lg:w-auto"
                      label={ticketLinkLabel}
                    />
                  ) : null}
                </div>
                {index < events.length - 1 ? <div className="border-b border-border" /> : null}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
