import type { Block } from 'payload'

function isValidURL(value: null | string | undefined) {
  if (!value) return true

  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export const SocialMediaBlock: Block = {
  slug: 'socialMediaBlock',
  interfaceName: 'SocialMediaBlock',
  labels: {
    plural: 'Redes sociales',
    singular: 'Red social',
  },
  fields: [
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Enlaces sociales',
      minRows: 1,
      required: true,
      fields: [
        {
          name: 'platform',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: (value: null | string | undefined) => {
            if (typeof value !== 'string' || !value.trim()) {
              return 'La URL de la red social es obligatoria.'
            }

            if (!isValidURL(value)) {
              return 'Ingresa una URL válida.'
            }

            return true
          },
        },
      ],
    },
  ],
}
