import React from 'react'

import type { EventsBlock as EventsBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { formatDateTime } from '@/utilities/formatDateTime'

export const EventsBlock: React.FC<EventsBlockProps> = (props) => {
  const { events, title } = props

  if (!events?.length) return null

  return (
    <section className="container my-16">
      <div className="space-y-6">
        {title ? <h2 className="text-3xl font-semibold tracking-tight">{title}</h2> : null}

        <div className="grid gap-4">
          {events.map((event, index) => {
            const { city, date, enableTicketLink, ticketLink, venue } = event

            return (
              <article
                className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm"
                key={index}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="grid gap-3 md:grid-cols-3 md:gap-6">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Date
                      </p>
                      <p className="text-base font-medium">{formatDateTime(date)}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        City
                      </p>
                      <p className="text-base font-medium">{city}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Venue
                      </p>
                      <p className="text-base font-medium">{venue}</p>
                    </div>
                  </div>

                  {enableTicketLink ? (
                    <CMSLink
                      {...ticketLink}
                      appearance={ticketLink?.appearance ?? 'default'}
                      className="w-full justify-center md:w-auto"
                      label="Buy Tickets"
                    />
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
