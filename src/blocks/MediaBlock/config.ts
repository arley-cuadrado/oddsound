import type { Block } from 'payload'

export const MediaBlock: Block = {
  slug: 'mediaBlock',
  interfaceName: 'MediaBlock',
  labels: {
    plural: 'Imágenes',
    singular: 'Imagen',
  },
  fields: [
    {
      name: 'media',
      type: 'upload',
      label: 'Seleccionar archivo',
      relationTo: 'media',
      required: true,
      validate: (value: unknown) => {
        return value ? true : 'Se requiere un archivo.'
      },
    },
  ],
}
