export const MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES = 1024 * 1024

export const mediaUploadLimitMessage =
  'El peso máximo de la imagen debe ser de 1MB (1.024 KB), optimiza e intenta nuevamente'

export function exceedsMediaUploadLimit(size: number) {
  return size > MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES
}

export const payloadUploadOptions = {
  abortOnLimit: true,
  limits: {
    fileSize: MEDIA_UPLOAD_MAX_FILE_SIZE_BYTES,
  },
  responseOnLimit: mediaUploadLimitMessage,
} as const
