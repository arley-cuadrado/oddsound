import {
  generateCreatorResetPasswordEmailHTML,
  generateCreatorResetPasswordEmailSubject,
  generateCreatorVerificationEmailHTML,
  generateCreatorVerificationEmailSubject,
} from '@/utilities/emailVerification'

type Props = {
  searchParams: Promise<{
    email?: string
    name?: string
  }>
}

const PREVIEW_TOKEN = 'preview-token-oddsound-1234567890'

function buildPreviewDocument(html: string) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Email Preview</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f2eb;">
    ${html}
  </body>
</html>`
}

function EmailPreviewCard({
  html,
  subject,
  title,
}: {
  html: string
  subject: string
  title: string
}) {
  return (
    <section className="space-y-4 rounded-[24px] border border-border bg-[#121212] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/45">{title}</p>
        <h2 className="text-xl font-medium text-foreground">{subject}</h2>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[#d7d0c4] bg-[#f5f2eb]">
        <iframe
          className="h-[720px] w-full bg-[#f5f2eb]"
          srcDoc={buildPreviewDocument(html)}
          title={title}
        />
      </div>
    </section>
  )
}

export default async function EmailPreviewPage({ searchParams }: Props) {
  const { email = 'demo@oddsound.co', name = 'ARTISTA TEST' } = await searchParams

  const verificationHTML = generateCreatorVerificationEmailHTML({
    token: PREVIEW_TOKEN,
    user: {
      email,
      name,
    },
  })

  const resetPasswordHTML = generateCreatorResetPasswordEmailHTML({
    token: PREVIEW_TOKEN,
    user: {
      email,
      name,
    },
  })

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Dev Preview</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Emails de oddsound</h1>
          <p className="max-w-3xl text-sm leading-7 text-white/65">
            Esta vista renderiza localmente los mismos HTML que hoy envía Payload por SMTP. Puedes
            editar las plantillas y refrescar esta ruta sin esperar un envío real por Resend.
          </p>
          <p className="text-xs text-white/45">
            Ruta: <code>/dev/email-preview</code> · Variables opcionales:{' '}
            <code>?name=ARTISTA TEST&email=demo@oddsound.co</code>
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <EmailPreviewCard
            html={verificationHTML}
            subject={generateCreatorVerificationEmailSubject()}
            title="Verificación"
          />

          <EmailPreviewCard
            html={resetPasswordHTML}
            subject={generateCreatorResetPasswordEmailSubject()}
            title="Recuperación"
          />
        </div>
      </div>
    </main>
  )
}
