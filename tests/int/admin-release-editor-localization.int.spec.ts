import { describe, expect, it } from 'vitest'

import { Content } from '@/blocks/Content/config'
import { Events } from '@/blocks/Events/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { SpotifyBlock } from '@/blocks/SpotifyBlock/config'
import { VideoBlock } from '@/blocks/VideoBlock/config'
import { Biographies } from '@/collections/Biographies'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import {
  exceedsMediaUploadLimit,
  MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES,
  payloadUploadOptions,
} from '@/config/uploadLimits'
import { linkGroup } from '@/fields/linkGroup'
import { hero } from '@/heros/config'
import { payloadSpanish } from '@/i18n/payloadSpanish'

function findFieldByName(fields: any[], name: string) {
  return fields.find((field) => field && typeof field === 'object' && field.name === name)
}

describe('release editor localization config', () => {
  it('overrides shared payload admin translations for media creation and content blocks', () => {
    expect(payloadSpanish.translations.error.noFilesUploaded).toBe('Se requiere un archivo.')
    expect(payloadSpanish.translations.general.create).toBe('Crear')
    expect(payloadSpanish.translations.general.createNew).toBe('Crear')
    expect(payloadSpanish.translations.general.creatingNewLabel).toBe('{{label}}')
    expect(payloadSpanish.translations.general.changesNotSaved).toBe(
      'Tus cambios no han sido guardados. Si sales ahora, se perderán.',
    )
    expect(payloadSpanish.translations.general.successfullyCreated).toBe(
      '{{label}} añadida correctamente',
    )
    expect(payloadSpanish.translations.general.layout).toBe('Sección')
    expect(payloadSpanish.translations.fields.searchForBlock).toBe('Buscar sección')
  })

  it('localizes the media collection labels and upload validation message', () => {
    const altField = findFieldByName(Media.fields as any[], 'alt')
    const captionField = findFieldByName(Media.fields as any[], 'caption')
    const beforeValidateHook = Media.hooks?.beforeValidate?.[0]
    const mediaBlockUploadField = findFieldByName(MediaBlock.fields as any[], 'media')

    expect(Media.labels).toEqual({
      plural: 'Imágenes',
      singular: 'Imagen',
    })
    expect(altField?.label).toBe('Texto alternativo')
    expect(captionField?.label).toBe('Subtítulo')

    try {
      beforeValidateHook?.({
        collection: Media as any,
        context: {},
        data: {},
        operation: 'create',
        req: {
          file: undefined,
          t: ((key: string) => key) as any,
        } as any,
      })
    } catch (error: any) {
      expect(error.data.errors[0].message).toBe('Se requiere un archivo.')
      expect(error.data.errors[0].path).toBe('archivo')
      expect(mediaBlockUploadField?.validate?.(null)).toBe('Se requiere un archivo.')
      return
    }

    throw new Error('Expected the media beforeValidate hook to reject missing files.')
  })

  it('enforces the 1MB media upload limit globally', () => {
    expect(MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES).toBe(1024 * 1024)
    expect(payloadUploadOptions.abortOnLimit).toBe(true)
    expect(payloadUploadOptions.limits.fileSize).toBe(MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES)
    expect(payloadUploadOptions.responseOnLimit).toBe(
      'El peso máximo de la imagen debe ser de 1MB (1.024 KB), optimiza e intenta nuevamente',
    )
    expect(exceedsMediaUploadLimit(MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES)).toBe(false)
    expect(exceedsMediaUploadLimit(MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES + 1)).toBe(true)
  })

  it('localizes hero image upload labels and required validation', () => {
    const albumImageField = findFieldByName((hero as any).fields, 'albumImage')
    const mediaField = findFieldByName((hero as any).fields, 'media')

    expect(albumImageField?.label).toBe('Imagen del álbum')
    expect(mediaField?.label).toBe('Imagen del álbum')
    expect(
      albumImageField?.validate?.(null, {
        siblingData: {
          type: 'lowImpact',
        },
      }),
    ).toBe('La imagen es requerida.')
    expect(
      mediaField?.validate?.(null, {
        siblingData: {
          type: 'highImpact',
        },
      }),
    ).toBe('La imagen es requerida.')
  })

  it('localizes shared link field labels', () => {
    const generatedLinkGroup = linkGroup() as any
    const linkField = generatedLinkGroup.fields[0]
    const typeRow = linkField.fields[0]
    const typeField = findFieldByName(typeRow.fields, 'type')

    expect(generatedLinkGroup.label).toBe('Enlaces')
    expect(generatedLinkGroup.labels).toEqual({
      plural: 'Enlaces',
      singular: 'Enlace',
    })
    expect(linkField.label).toBe('Enlace')
    expect(typeField?.label).toBe('Tipo')
  })

  it('localizes shared release block field labels', () => {
    const pagesTabsField = (Pages.fields as any[]).find((field) => field?.type === 'tabs')
    const contentTab = pagesTabsField?.tabs?.find((tab: any) => tab?.label === 'Contenido')
    const seoTab = pagesTabsField?.tabs?.find((tab: any) => tab?.label === 'SEO')
    const biographiesTabsField = (Biographies.fields as any[]).find((field) => field?.type === 'tabs')
    const biographyTab = biographiesTabsField?.tabs?.find((tab: any) => tab?.label === 'Bio')
    const releaseLayoutField = findFieldByName(contentTab?.fields ?? [], 'layout')
    const biographyLayoutField = findFieldByName(biographyTab?.fields ?? [], 'layout')
    const seoTitleField = findFieldByName(seoTab?.fields ?? [], 'title')
    const contentColumnsField = findFieldByName(Content.fields as any[], 'columns')
    const contentSizeField = findFieldByName(contentColumnsField?.fields ?? [], 'size')
    const eventsField = findFieldByName(Events.fields as any[], 'events')
    const mediaField = findFieldByName(MediaBlock.fields as any[], 'media')
    const spotifyField = findFieldByName(SpotifyBlock.fields as any[], 'spotify')
    const videoField = findFieldByName(VideoBlock.fields as any[], 'video')

    expect(releaseLayoutField?.label).toBe(
      'Agrega las secciones que consideres necesarias para tu lanzamiento, muévelas a tu conveniencia y crea el flujo que más te guste.',
    )
    expect(releaseLayoutField?.labels).toEqual({
      plural: 'Secciones',
      singular: 'Sección',
    })
    expect(biographyLayoutField?.labels).toEqual({
      plural: 'Secciones',
      singular: 'Sección',
    })
    expect(biographyLayoutField?.maxRows).toBe(1)
    expect(biographyLayoutField?.defaultValue).toEqual([
      {
        blockType: 'content',
        columns: [
          {
            size: 'full',
            richText: {
              root: {
                type: 'root',
                children: [],
                direction: null,
                format: '',
                indent: 0,
                version: 1,
              },
            },
          },
        ],
      },
    ])
    expect(seoTitleField?.label).toBe('Título')
    expect(contentColumnsField?.label).toBe(
      'Escribe sobre tu trabajo musical, tu inspiración, etc.',
    )
    expect(contentSizeField?.label).toBe('Tamaño')
    expect(eventsField?.label).toBe('Eventos')
    expect(mediaField?.label).toBe('Seleccionar archivo')
    expect(spotifyField?.label).toBe(
      'Añadir URL de Spotify (Añade enlace de álbum o de un sencillo)',
    )
    expect(videoField?.label).toBe('Añadir URL de YouTube')
  })
})
