import { es } from '@payloadcms/translations/languages/es'

export const payloadSpanish = {
  ...es,
  translations: {
    ...es.translations,
    general: {
      ...es.translations.general,
      create: 'Añadir imagen',
      createNew: 'Añadir imagen',
      creatingNewLabel: '{{label}}',
      successfullyCreated: '{{label}} añadida correctamente',
    },
  },
}
