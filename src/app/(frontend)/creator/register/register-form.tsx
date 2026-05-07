'use client'

import { registerCreator } from '@/app/(frontend)/creator/actions'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

type AccountType = 'artist' | 'band' | 'label'

function parseErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === 'object' &&
    'errors' in payload &&
    Array.isArray((payload as { errors?: Array<{ message?: string }> }).errors) &&
    (payload as { errors?: Array<{ message?: string }> }).errors?.[0]?.message
  ) {
    return (payload as { errors: Array<{ message?: string }> }).errors[0]?.message || fallback
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: string }).message
    if (message) return message
  }

  return fallback
}

export function RegisterForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '')
    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')
    const accountType = String(formData.get('accountType') || 'artist') as AccountType

    try {
      const result = await registerCreator({
        accountType,
        email,
        name,
        password,
      })

      if (!result.ok) {
        throw new Error(parseErrorMessage(result, 'Unable to create your account.'))
      }

      router.push('/admin')
      router.refresh()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="name">
          Name
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground outline-none"
          id="name"
          name="name"
          placeholder="Your artist, band, or label name"
          required
          type="text"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="accountType">
          Account type
        </label>
        <select
          className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground outline-none"
          defaultValue="artist"
          id="accountType"
          name="accountType"
        >
          <option value="artist">Artist</option>
          <option value="band">Band</option>
          <option value="label">Label</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="email">
          Email
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground outline-none"
          id="email"
          name="email"
          placeholder="name@example.com"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="password">
          Password
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground outline-none"
          id="password"
          minLength={8}
          name="password"
          placeholder="At least 8 characters"
          required
          type="password"
        />
      </div>

      {error && (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>
      )}

      <button
        className="mt-2 h-12 w-full bg-[#312e2e] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
