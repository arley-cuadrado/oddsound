import type { Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'

export const hero: Field = {
  name: 'hero',
  type: 'group',
  fields: [
    {
      name: 'type',
      type: 'select',
      defaultValue: 'lowImpact',
      label: 'Tipo',
      options: [
        {
          label: 'Ninguno',
          value: 'none',
        },
        {
          label: 'Alto impacto',
          value: 'highImpact',
        },
        {
          label: 'Impacto medio',
          value: 'mediumImpact',
        },
        {
          label: 'Bajo impacto',
          value: 'lowImpact',
        },
      ],
      required: true,
    },
    {
      name: 'richText',
      type: 'richText',
      admin: {
        condition: (_, { type } = {}) => type === 'lowImpact',
      },
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: false,
    },
    {
      name: 'albumImage',
      type: 'upload',
      admin: {
        condition: (_, { type } = {}) => type === 'lowImpact',
        description: 'Obligatoria para las cards de releases, incluso cuando el hero de bajo impacto no muestra imagen visible.',
      },
      relationTo: 'media',
      validate: (
        value: unknown,
        { siblingData }: { siblingData?: { type?: null | string } },
      ) => {
        if (siblingData?.type !== 'lowImpact') return true

        return value ? true : 'La imagen del álbum es obligatoria para los releases de bajo impacto.'
      },
    },
    linkGroup({
      overrides: {
        maxRows: 2,
      },
    }),
    {
      name: 'media',
      type: 'upload',
      admin: {
        condition: (_, { type } = {}) => ['highImpact', 'mediumImpact'].includes(type),
      },
      relationTo: 'media',
      required: true,
    },
  ],
  label: false,
}
