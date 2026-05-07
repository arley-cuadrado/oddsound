import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'
import { RegisterForm } from './register-form'

export default async function CreatorRegisterPage() {
  await getMeUser({
    validUserRedirect: '/admin',
  }).catch(() => null)

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-[30rem]">
        <div className="mb-8">
          <p className="text-sm text-foreground/80">
            Welcome to <strong>oddsound</strong> space, create your account here.
          </p>
        </div>

        <RegisterForm />

        <p className="mt-8 text-sm text-foreground/80">
          Already registered?{' '}
          <Link className="text-foreground underline underline-offset-2" href="/admin/login">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
