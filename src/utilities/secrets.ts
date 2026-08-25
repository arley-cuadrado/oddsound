import crypto from 'crypto'

function getEncryptionKeyMaterial() {
  return process.env.MARKETPLACE_TOKEN_ENCRYPTION_KEY || process.env.PAYLOAD_SECRET || ''
}

function getEncryptionKey() {
  const keyMaterial = getEncryptionKeyMaterial()

  if (!keyMaterial) {
    throw new Error('Missing MARKETPLACE_TOKEN_ENCRYPTION_KEY or PAYLOAD_SECRET.')
  }

  return crypto.createHash('sha256').update(keyMaterial).digest()
}

export function encryptSecret(value: string) {
  if (!value) return ''

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('base64url'), authTag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function decryptSecret(payload: null | string | undefined) {
  if (!payload) return ''

  const [ivPart, authTagPart, encryptedPart] = payload.split('.')

  if (!ivPart || !authTagPart || !encryptedPart) {
    throw new Error('Invalid encrypted secret payload.')
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivPart, 'base64url'),
  )

  decipher.setAuthTag(Buffer.from(authTagPart, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
