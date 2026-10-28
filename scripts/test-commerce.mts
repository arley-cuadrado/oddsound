import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { spawn } from 'node:child_process'
const replica = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  binary: { version: '7.0.24' },
})
const env = {
  ...process.env,
  DATABASE_URL: replica.getUri('oddsound-validation'),
  PAYLOAD_SECRET: 'isolated-local-validation-secret',
  WOMPI_PUBLIC_KEY: 'pub_test_local',
  WOMPI_INTEGRITY_SECRET: 'local-only',
  NEXT_PUBLIC_SERVER_URL: 'http://localhost:3000',
  SHOPPING_ENABLED: 'true',
}
const mode = process.argv[2] || 'integration'
const args =
  mode === 'e2e'
    ? ['node_modules/@playwright/test/cli.js', 'test', 'tests/e2e/commerce.e2e.spec.ts']
    : mode === 'build'
      ? ['node_modules/next/dist/bin/next', 'build']
      : [
          'node_modules/vitest/vitest.mjs',
          'run',
          '--exclude',
          'tests/int/commerce-finance.int.spec.ts',
        ]
let child: ReturnType<typeof spawn> | undefined
process.on('SIGTERM', () => child?.kill('SIGTERM'))
try {
  child = spawn(process.execPath, args, { env, stdio: 'inherit' })
  process.exitCode = await new Promise<number>((resolve) => {
    child!.on('exit', (code) => resolve(code || 0))
    child!.on('error', () => resolve(1))
  })
} finally {
  await replica.stop()
}
