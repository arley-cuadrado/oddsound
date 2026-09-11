import { getPayload } from 'payload'

import config from '../src/payload.config.ts'
import { ensureCreatorProfile } from '../src/utilities/creatorProfiles.ts'
import { getUserIdentityMigrationPatch } from '../src/utilities/userIdentityMigration.ts'

type MigratableUser = {
  accountType?: 'artist' | 'band' | 'label' | null
  editorAccess?: boolean | null
  email?: null | string
  id: string
  name?: null | string
  profile?: null | string | { id?: null | string }
  role?: null | string
  userType?: null | string
}

const shouldWrite = process.argv.includes('--write')
const payload = await getPayload({ config })

const limit = 100
let page = 1
let totalScanned = 0
let totalChanged = 0
let totalCandidates = 0
const previews: string[] = []

while (true) {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit,
    overrideAccess: true,
    page,
    pagination: true,
  })

  const docs = result.docs as MigratableUser[]

  for (const user of docs) {
    totalScanned += 1
    const patch = getUserIdentityMigrationPatch(user)

    if (!patch) continue

    totalCandidates += 1
    const summary = `${user.email || user.id}: ${JSON.stringify(patch)}`

    if (previews.length < 25) {
      previews.push(summary)
    }

    if (!shouldWrite) continue

    const updated = (await payload.update({
      collection: 'users',
      id: user.id,
      data: patch,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })) as MigratableUser

    await ensureCreatorProfile({
      payload,
      user: {
        accountType: updated.accountType,
        editorAccess: updated.editorAccess,
        email: updated.email,
        id: updated.id,
        name: updated.name,
        profile: updated.profile,
        role: updated.role,
        userType: updated.userType,
      },
    })

    totalChanged += 1
  }

  if (page >= result.totalPages) break
  page += 1
}

console.log(`Scanned users: ${totalScanned}`)
console.log(`Migration candidates: ${totalCandidates}`)
console.log(`Applied changes: ${shouldWrite ? totalChanged : 0}`)
console.log(`Mode: ${shouldWrite ? 'write' : 'dry-run'}`)

if (previews.length > 0) {
  console.log('Preview:')
  for (const line of previews) {
    console.log(`- ${line}`)
  }
}

if (!shouldWrite) {
  console.log('Run with --write to apply the changes.')
}
