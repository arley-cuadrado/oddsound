import type { Block, Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link'

function createColumnFields(options?: { disableAppearances?: boolean; groupLabel?: string }) {
  const disableAppearances = Boolean(options?.disableAppearances)
  const groupLabel = options?.groupLabel || 'Enlace'

  return [
  {
    name: 'size',
    type: 'select',
    label: 'Tamaño',
    defaultValue: 'oneThird',
    options: [
      {
        label: 'Un tercio',
        value: 'oneThird',
      },
      {
        label: 'Mitad',
        value: 'half',
      },
      {
        label: 'Dos tercios',
        value: 'twoThirds',
      },
      {
        label: 'Completo',
        value: 'full',
      },
    ],
  },
  {
    name: 'richText',
    type: 'richText',
    editor: lexicalEditor({
      features: ({ rootFeatures }) => {
        return [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ]
      },
    }),
    label: false,
  },
  {
    name: 'enableLink',
    type: 'checkbox',
    label: 'Habilitar enlace',
  },
  link({
    appearances: disableAppearances ? false : undefined,
    overrides: {
      label: groupLabel,
      admin: {
        condition: (_data, siblingData) => {
          return Boolean(siblingData?.enableLink)
        },
      },
    },
  }),
  ] satisfies Field[]
}

function createContentBlock(options?: {
  arrayLabel?: string
  arrayLabels?: { plural: string; singular: string }
  disableAppearances?: boolean
  groupLabel?: string
}) {
  return {
    slug: 'content',
    interfaceName: 'ContentBlock',
    labels: {
      plural: 'Textos',
      singular: 'Texto',
    },
    fields: [
      {
        name: 'columns',
        type: 'array',
        label: options?.arrayLabel || 'Escribe sobre tu trabajo musical, tu inspiración, etc.',
        admin: {
          initCollapsed: true,
        },
        labels: options?.arrayLabels || {
          plural: 'Texto',
          singular: 'Texto',
        },
        fields: createColumnFields({
          disableAppearances: options?.disableAppearances,
          groupLabel: options?.groupLabel,
        }),
      },
    ],
  } satisfies Block
}

export const Content: Block = createContentBlock()

export const BiographyContent: Block = createContentBlock({
  disableAppearances: true,
})
