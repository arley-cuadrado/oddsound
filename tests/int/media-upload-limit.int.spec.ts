import { describe, expect, it } from 'vitest'

import {
  MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES,
  mediaUploadLimitMessage,
  payloadUploadOptions,
} from '@/config/uploadLimits'

describe('media upload limit config', () => {
  it('rejects uploads larger than 1MB before persistence', () => {
    expect(MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES).toBe(1024 * 1024)
    expect(payloadUploadOptions.abortOnLimit).toBe(true)
    expect(payloadUploadOptions.limits.fileSize).toBe(MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES)
    expect(payloadUploadOptions.responseOnLimit).toBe(mediaUploadLimitMessage)
    expect(mediaUploadLimitMessage).toBe(
      'El peso máximo de la imagen debe ser de 1MB (1.024 KB), optimiza e intenta nuevamente',
    )
  })
})
