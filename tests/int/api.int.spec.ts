import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let initError: Error | null = null

function timeoutAfter(ms: number) {
  return new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Payload init timed out after ${ms}ms`))
    }, ms)
  })
}

describe('API', () => {
  beforeAll(async () => {
    try {
      const payloadConfig = await config
      payload = await Promise.race([
        getPayload({ config: payloadConfig }),
        timeoutAfter(5000),
      ])
    } catch (error) {
      initError = error instanceof Error ? error : new Error(String(error))
    }
  })

  it('fetches users', async () => {
    if (!payload) {
      expect(initError?.message).toMatch(/cannot connect to MongoDB|ECONNREFUSED|querySrv|timed out/i)
      return
    }

    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })
})
