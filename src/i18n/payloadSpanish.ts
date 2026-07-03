import { es } from '@payloadcms/translations/languages/es'

export const payloadSpanish = {
  ...es,
  translations: {
    ...es.translations,
    fields: {
      ...es.translations.fields,
      searchForBlock: 'Buscar sección',
    },
    general: {
      ...es.translations.general,
      create: 'Añadir imagen',
      createNew: 'Añadir imagen',
      creatingNewLabel: '{{label}}',
      layout: 'sección',
      successfullyCreated: '{{label}} añadida correctamente',
    },
  },
}
