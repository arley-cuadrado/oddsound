import crypto from 'crypto'
import { describe, expect, it } from 'vitest'

import {
  buildSignatureManifest,
  verifyMercadoPagoSignature,
} from '@/utilities/mercadoPagoWebhook'

const SECRET = 'test-webhook-secret'

function sign({
  dataID,
  requestID,
  secret = SECRET,
  ts = String(Math.floor(Date.now() / 1000)),
}: {
  dataID: string
  requestID: string
  secret?: string
  ts?: string
}) {
  const manifest = buildSignatureManifest({ dataID, requestID, ts })
  const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  return `ts=${ts},v1=${v1}`
}

describe('buildSignatureManifest', () => {
  it('matches the documented template', () => {
    expect(buildSignatureManifest({ dataID: '123', requestID: 'req-1', ts: '999' })).toBe(
      'id:123;request-id:req-1;ts:999;',
    )
  })

  it('lowercases the payment id', () => {
    expect(buildSignatureManifest({ dataID: 'ABC', requestID: 'r', ts: '1' })).toContain('id:abc;')
  })

  it('drops a segment whose value is missing rather than sending it empty', () => {
    expect(buildSignatureManifest({ dataID: '123', requestID: '', ts: '999' })).toBe(
      'id:123;ts:999;',
    )
  })
})

describe('verifyMercadoPagoSignature', () => {
  it('accepts a signature built with the shared secret', () => {
    const dataID = '1234567890'
    const requestID = 'req-abc'

    expect(
      verifyMercadoPagoSignature({
        dataID,
        requestID,
        secret: SECRET,
        signatureHeader: sign({ dataID, requestID }),
      }),
    ).toBe(true)
  })

  it('rejects a signature made with a different secret', () => {
    const dataID = '1234567890'
    const requestID = 'req-abc'

    expect(
      verifyMercadoPagoSignature({
        dataID,
        requestID,
        secret: SECRET,
        signatureHeader: sign({ dataID, requestID, secret: 'wrong-secret' }),
      }),
    ).toBe(false)
  })

  it('rejects when the payment id does not match the one that was signed', () => {
    const requestID = 'req-abc'

    expect(
      verifyMercadoPagoSignature({
        dataID: '9999999999',
        requestID,
        secret: SECRET,
        signatureHeader: sign({ dataID: '1234567890', requestID }),
      }),
    ).toBe(false)
  })

  it('rejects a replayed notification from days ago', () => {
    const dataID = '1234567890'
    const requestID = 'req-abc'
    const staleTs = String(Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000))

    expect(
      verifyMercadoPagoSignature({
        dataID,
        requestID,
        secret: SECRET,
        signatureHeader: sign({ dataID, requestID, ts: staleTs }),
      }),
    ).toBe(false)
  })

  it('accepts a timestamp sent in milliseconds', () => {
    const dataID = '1234567890'
    const requestID = 'req-abc'

    expect(
      verifyMercadoPagoSignature({
        dataID,
        requestID,
        secret: SECRET,
        signatureHeader: sign({ dataID, requestID, ts: String(Date.now()) }),
      }),
    ).toBe(true)
  })

  it('rejects a malformed or missing header', () => {
    const base = { dataID: '123', requestID: 'r', secret: SECRET }

    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: 'nonsense' })).toBe(false)
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: null })).toBe(false)
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: 'ts=1,v1=' })).toBe(false)
  })

  it('rejects everything when no secret is configured', () => {
    const dataID = '123'
    const requestID = 'r'

    expect(
      verifyMercadoPagoSignature({
        dataID,
        requestID,
        secret: '',
        signatureHeader: sign({ dataID, requestID }),
      }),
    ).toBe(false)
  })
})
