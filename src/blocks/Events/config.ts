import type { Block } from 'payload'

import { link } from '@/fields/link'

export const Events: Block = {
  slug: 'events',
  interfaceName: 'EventsBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Section Title',
    },
    {
      name: 'events',
      type: 'array',
      minRows: 1,
      required: true,
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'city',
              type: 'text',
              required: true,
              admin: {
                width: '50%',
              },
            },
            {
              name: 'venue',
              type: 'text',
              required: true,
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'enableTicketLink',
          type: 'checkbox',
          label: 'Enable ticket purchase',
        },
        link({
          disableLabel: true,
          appearances: ['default', 'outline'],
          overrides: {
            name: 'ticketLink',
            label: 'Ticket Link',
            admin: {
              condition: (_data, siblingData) => Boolean(siblingData?.enableTicketLink),
            },
          },
        }),
      ],
    },
  ],
  labels: {
    plural: 'Events',
    singular: 'Events',
  },
}
