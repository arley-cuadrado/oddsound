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
  fields: [
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Social links',
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
              return 'A social media URL is required.'
            }

            if (!isValidURL(value)) {
              return 'Enter a valid URL.'
            }

            return true
          },
        },
      ],
    },
  ],
}
