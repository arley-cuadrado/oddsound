import { es } from '@payloadcms/translations/languages/es'

export const payloadSpanish = {
  ...es,
  translations: {
    ...es.translations,
    error: {
      ...es.translations.error,
      noFilesUploaded: 'Se requiere un archivo.',
    },
    fields: {
      ...es.translations.fields,
      searchForBlock: 'Buscar sección',
    },
    general: {
      ...es.translations.general,
      changesNotSaved: 'Tus cambios no han sido guardados. Si sales ahora, se perderán.',
      create: 'Crear',
      createNew: 'Crear',
      creatingNewLabel: '{{label}}',
      layout: 'Sección',
      successfullyCreated: '{{label}} añadida correctamente',
    },
    validation: {
      ...es.translations.validation,
      required: 'Se requiere un archivo.',
    },
  },
}
