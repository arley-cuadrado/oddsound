import type { Block } from 'payload'

import { link } from '@/fields/link'

export const Events: Block = {
  slug: 'events',
  interfaceName: 'EventsBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Título de la sección',
    },
    {
      name: 'events',
      type: 'array',
      labels: {
        plural: 'Eventos',
        singular: 'Evento',
      },
      minRows: 1,
      required: true,
      fields: [
        {
          name: 'date',
          type: 'date',
          label: 'Fecha',
          required: true,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'city',
              type: 'text',
              label: 'Ciudad',
              required: true,
              admin: {
                width: '50%',
              },
            },
            {
              name: 'venue',
              type: 'text',
              label: 'Lugar',
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
          label: 'Habilitar compra de entradas',
        },
        link({
          disableLabel: true,
          appearances: ['default', 'outline'],
          overrides: {
            name: 'ticketLink',
            label: 'Enlace de entradas',
            admin: {
              condition: (_data, siblingData) => Boolean(siblingData?.enableTicketLink),
            },
          },
        }),
      ],
    },
  ],
  labels: {
    plural: 'Eventos',
    singular: 'Evento',
  },
}
