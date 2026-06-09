import type { Block } from 'payload'

import { socialLinksField } from '@/fields/socialLinks'

export const SocialMediaBlock: Block = {
  slug: 'socialMediaBlock',
  interfaceName: 'SocialMediaBlock',
  labels: {
    plural: 'Redes sociales',
    singular: 'Red social',
  },
  fields: [socialLinksField({ required: true })],
}
