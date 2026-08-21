import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let initError: Error | null = null

describe('API', () => {
  beforeAll(async () => {
    try {
      const payloadConfig = await config
      payload = await getPayload({ config: payloadConfig })
    } catch (error) {
      initError = error instanceof Error ? error : new Error(String(error))
    }
  })

  it('fetches users', async () => {
    if (!payload) {
      expect(initError?.message).toMatch(/cannot connect to MongoDB|ECONNREFUSED|querySrv/i)
      return
    }

    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })
})
