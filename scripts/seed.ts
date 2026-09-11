import { getPayload } from 'payload'

// Relative, extensionless, and pointing at index explicitly: `payload run`
// resolves these, while a bare directory specifier silently resolves to nothing.
import config from '../src/payload.config'
import { SEED_ADMIN_EMAIL, SEED_PASSWORD } from '../src/seed/constants'
import { seed } from '../src/seed/index'

const args = new Set(process.argv.slice(2))
const fresh = args.has('--fresh')
const stress = args.has('--stress')
const force = args.has('--force')

function fail(message: string): never {
  console.error(`\n  ✖ ${message}\n`)
  process.exit(1)
}

/** Never print credentials; the host is enough to tell environments apart. */
function describeDatabase(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return '(no se pudo interpretar DATABASE_URL)'
  }
}

const databaseURL = process.env.DATABASE_URL || ''

if (!databaseURL) {
  fail('DATABASE_URL no está definida. Copia .env.example a .env y apunta a tu base local.')
}

const isLocalDatabase = /localhost|127\.0\.0\.1|@mongo[:/]/.test(databaseURL)

if (!force) {
  if (process.env.NODE_ENV === 'production') {
    fail('NODE_ENV=production. Si de verdad quieres sembrar aquí, repite con --force.')
  }

  if (!isLocalDatabase) {
    fail(
      `DATABASE_URL no apunta a una base local: ${describeDatabase(databaseURL)}\n    Si es intencional, repite con --force.`,
    )
  }
}

console.log(`\n  Base de datos: ${describeDatabase(databaseURL)}`)
console.log(
  `  Modo: ${fresh ? 'fresh (borra lo sembrado)' : 'upsert'}${stress ? ' + stress' : ''}\n`,
)

/**
 * Closes the database handle and waits for stdout to drain before exiting.
 * Calling process.exit() straight away discards buffered output whenever
 * stdout is a pipe rather than a terminal, which silently swallowed the whole
 * report under `| tee`, `| tail` and CI log capture.
 */
async function shutdown(code: number): Promise<never> {
  await payload.destroy()

  await new Promise<void>((resolve) => {
    if (process.stdout.write('')) {
      resolve()
      return
    }

    process.stdout.once('drain', () => resolve())
  })

  process.exit(code)
}

const payload = await getPayload({ config })
const startedAt = Date.now()

try {
  const summary = await seed({
    fresh,
    log: (message) => console.log(`  ${message}`),
    payload,
    stress,
  })

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)

  console.log(`\n  Listo en ${seconds}s`)
  console.log(`    Artistas:     ${summary.artists}`)
  console.log(`    Lanzamientos: ${summary.releases}`)
  console.log(`    Escenas:      ${summary.scenes}`)
  console.log(`    Biografías:   ${summary.biographies}`)
  console.log(`    Productos:    ${summary.products}`)
  console.log(`\n  Entra en /dashboard o /creator/login con:`)
  console.log(`    Admin:   ${SEED_ADMIN_EMAIL}`)
  console.log(`    Creador: los-petirrojos@seed.oddsound.test (y el resto de slugs)`)
  console.log(`    Clave:   ${SEED_PASSWORD}\n`)

  await shutdown(0)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`\n  ✖ El seed falló: ${message}`)

  if (/transaction/i.test(message)) {
    console.error(
      '\n  Payload abre una transacción por operación y MongoDB solo las admite en replica set.',
    )
    console.error('  Levanta la base con `docker compose up -d mongo` o usa Atlas.\n')
  }

  await shutdown(1)
}
