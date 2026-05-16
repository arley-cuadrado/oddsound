import { getPayload } from 'payload'

import config from '../src/payload.config.ts'

const email = process.argv[2]?.trim().toLowerCase()

if (!email) {
  console.error('Usage: pnpm promote:admin <email>')
  process.exit(1)
}

const payload = await getPayload({ config })

const users = await payload.find({
  collection: 'users',
  depth: 0,
  limit: 1,
  overrideAccess: true,
  pagination: false,
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

if (user.role === 'admin') {
  console.log(`User ${email} is already an admin.`)
  process.exit(0)
}

await payload.update({
  collection: 'users',
  id: user.id,
  data: {
    role: 'admin',
  },
  depth: 0,
  overrideAccess: true,
})

console.log(`Promoted ${email} to admin.`)
