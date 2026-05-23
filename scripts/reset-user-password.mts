import { getPayload } from 'payload'

import config from '../src/payload.config.ts'

const email = process.argv[2]?.trim().toLowerCase()
const password = process.argv[3]
const shouldVerify = process.argv.includes('--verify')

if (!email || !password) {
  console.error('Usage: pnpm node:reset-password <email> <new-password> [--verify]')
  process.exit(1)
}

const payload = await getPayload({ config })

const users = await payload.find({
  collection: 'users',
  depth: 0,
  limit: 1,
  overrideAccess: true,
  pagination: false,
  showHiddenFields: true,
  where: {
    email: {
      equals: email,
    },
  },
})

const user = users.docs[0]

if (!user) {
  console.error(`User not found: ${email}`)
  process.exit(1)
}

await payload.update({
  collection: 'users',
  id: user.id,
  data: {
    ...(shouldVerify
      ? {
          _verificationToken: null,
          _verified: true,
        }
      : {}),
    password,
  } as never,
  depth: 0,
  overrideAccess: true,
  showHiddenFields: true,
})

console.log(`Updated password for ${email}.${shouldVerify ? ' Marked as verified.' : ''}`)
