import { describe, expect, it } from 'vitest'

import { Content } from '@/blocks/Content/config'
import { Events } from '@/blocks/Events/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { SpotifyBlock } from '@/blocks/SpotifyBlock/config'
import { VideoBlock } from '@/blocks/VideoBlock/config'
import { payloadUploadOptions } from '@/config/uploadLimits'
import { linkGroup } from '@/fields/linkGroup'
import { hero } from '@/heros/config'
import { payloadSpanish } from '@/i18n/payloadSpanish'

function findFieldByName(fields: any[], name: string) {
  return fields.find((field) => field && typeof field === 'object' && field.name === name)
}

describe('admin localization config', () => {
  it('overrides the shared Payload admin translations used by the release editor', () => {
    expect(payloadSpanish.translations.general.create).toBe('Añadir imagen')
    expect(payloadSpanish.translations.general.creatingNewLabel).toBe('{{label}}')
    expect(payloadSpanish.translations.general.layout).toBe('sección')
    expect(payloadSpanish.translations.general.successfullyCreated).toBe(
      '{{label}} añadida correctamente',
    )
    expect(payloadSpanish.translations.fields.searchForBlock).toBe('Buscar sección')
  })

  it('configures the global upload parser to reject files larger than 1MB', () => {
    expect(payloadUploadOptions.abortOnLimit).toBe(true)
    expect(payloadUploadOptions.limits.fileSize).toBe(1024 * 1024)
    expect(payloadUploadOptions.responseOnLimit).toBe(
      'El peso máximo de la imagen debe ser de 1MB (1.024 KB), optimiza e intenta nuevamente',
    )
  })

  it('localizes shared link controls', () => {
    const generatedLinkGroup = linkGroup() as any
    const linkField = generatedLinkGroup.fields[0]
    const typeRow = linkField.fields[0]
    const typeField = findFieldByName(typeRow.fields, 'type')

    expect(generatedLinkGroup.labels).toEqual({
      plural: 'Enlaces',
      singular: 'Enlace',
    })
    expect(linkField.label).toBe('Enlace')
    expect(typeField?.label).toBe('Tipo')
  })

  it('localizes release block labels and guidance', () => {
    const contentColumns = findFieldByName(Content.fields, 'columns')
    const sizeField = findFieldByName(contentColumns.fields, 'size')
    const eventsField = findFieldByName(Events.fields, 'events')
    const mediaField = findFieldByName(MediaBlock.fields, 'media')
    const spotifyField = findFieldByName(SpotifyBlock.fields, 'spotify')
    const videoField = findFieldByName(VideoBlock.fields, 'video')

    expect(contentColumns.label).toBe('Escribe sobre tu trabajo musical, tu inspiración, etc.')
    expect(sizeField?.label).toBe('Tamaño')
    expect(eventsField?.label).toBe('Eventos')
    expect(mediaField?.label).toBe('Seleccionar archivo')
    expect(spotifyField?.label).toBe(
      'Añadir URL de Spotify (Añade enlace de álbum o de un sencillo)',
    )
    expect(videoField?.label).toBe('Añadir URL de YouTube')
  })

  it('localizes hero upload fields and required image validation', () => {
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
})
