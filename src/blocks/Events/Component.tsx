import React from 'react'

import type { EventsBlock as EventsBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'

function formatEventDateParts(timestamp: string) {
  const value = timestamp ? new Date(timestamp) : new Date()

  return {
    day: value.getDate().toString().padStart(2, '0'),
    month: value.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
  }
}

export const EventsBlock: React.FC<EventsBlockProps> = (props) => {
  const { events, title } = props

  if (!events?.length) return null

  return (
    <section className="container my-16">
      <div className="space-y-6">
        {title ? <h2 className="text-3xl font-semibold tracking-tight">{title}</h2> : null}

        <div className="grid gap-0">
          {events.map((event, index) => {
            const { city, date, enableTicketLink, ticketLink, venue } = event
            const { day, month } = formatEventDateParts(date)

            return (
              <article className="bg-transparent px-5 shadow-none" key={index}>
                <div className="flex flex-col gap-6 py-4 md:flex-row md:items-start md:justify-between">
                  <div className="grid gap-5 md:grid-cols-[52px_minmax(0,140px)_minmax(0,220px)] md:items-start md:gap-8">
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
                      <p className="flex h-[18px] items-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-gray-400">
                        City
                      </p>
                      <p className="flex h-[40px] items-center text-[18px] font-semibold leading-tight text-slate-600 dark:text-slate-300">
                        {city}
                      </p>
                    </div>

                    <div>
                      <p className="flex h-[18px] items-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-gray-400">
                        Venue
                      </p>
                      <p className="flex h-[40px] items-center text-[18px] font-semibold leading-tight text-slate-600 dark:text-slate-300">
                        {venue}
                      </p>
                    </div>
                  </div>

                  {enableTicketLink ? (
                    <CMSLink
                      {...ticketLink}
                      appearance={ticketLink?.appearance ?? 'default'}
                      className="w-full justify-center md:mt-2 md:w-auto"
                      label="Buy Tickets"
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
