import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

function getEncryptionKey() {
  const seed = process.env.MARKETPLACE_TOKEN_ENCRYPTION_KEY || process.env.PAYLOAD_SECRET

  if (!seed) {
    throw new Error('Missing MARKETPLACE_TOKEN_ENCRYPTION_KEY or PAYLOAD_SECRET for encryption.')
  }

  return createHash('sha256').update(seed).digest()
}

export function encryptSecret(value: null | string | undefined): null | string {
  if (!value) return null

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
}

export function decryptSecret(value: null | string | undefined): null | string {
  if (!value) return null

  const [ivRaw, tagRaw, encryptedRaw] = value.split('.')

  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Encrypted secret has an invalid format.')
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivRaw, 'base64'),
  )

  decipher.setAuthTag(Buffer.from(tagRaw, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
