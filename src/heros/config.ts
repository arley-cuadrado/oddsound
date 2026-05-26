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
        description:
          'Visible solo en el detalle del release de bajo impacto. La imagen del álbum se usa únicamente en la card del home.',
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
        description:
          'Obligatoria para la card del home. Esta imagen no se muestra en el detalle del release de bajo impacto.',
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
        description:
          'Obligatoria para releases de alto y medio impacto. Esta imagen se muestra tanto en la card del home como en el detalle.',
      },
      relationTo: 'media',
      validate: (
        value: unknown,
        { siblingData }: { siblingData?: { type?: null | string } },
      ) => {
        if (!['highImpact', 'mediumImpact'].includes(siblingData?.type || '')) return true

        return value ? true : 'La imagen principal es obligatoria para los releases de alto y medio impacto.'
      },
    },
  ],
  label: false,
}
