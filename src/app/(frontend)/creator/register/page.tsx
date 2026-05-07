import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { RegisterForm } from './register-form'

export default async function CreatorRegisterPage() {
  await getMeUser({
    validUserRedirect: '/admin',
  }).catch(() => null)

  return (
    <main className="container py-16">
      <div className="mx-auto max-w-md border border-border bg-card p-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">ODDSOUND creators</p>
          <h1 className="mt-2 text-3xl font-semibold">Create your account</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Register as an artist, band, or label. After creating your account, you will
            continue into ODDSOUND Admin with creator-only permissions.
          </p>
        </div>

        <RegisterForm />

        <p className="mt-6 text-sm text-muted-foreground">
          Already registered?{' '}
          <Link className="font-medium text-foreground underline" href="/admin/login">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
