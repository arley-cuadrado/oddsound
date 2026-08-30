import type { ArrayField } from 'payload'

function isValidURL(value: null | string | undefined) {
  if (!value) return true

  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function socialLinksField(options?: {
  label?: string
  minRows?: number
  platformLabel?: string
  required?: boolean
  urlLabel?: string
}) {
  return {
    name: 'socialLinks',
    type: 'array',
    label: options?.label || 'Enlaces sociales',
    minRows: options?.minRows ?? 1,
    required: options?.required ?? false,
    labels: {
      plural: 'Enlaces',
      singular: 'Enlace',
    },
    fields: [
      {
        name: 'platform',
        type: 'text',
        label: options?.platformLabel || 'Plataforma',
        required: true,
      },
      {
        name: 'url',
        type: 'text',
        label: options?.urlLabel || 'URL',
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
  } satisfies ArrayField
}
