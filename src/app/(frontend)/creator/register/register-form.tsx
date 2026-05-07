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
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '')
    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')
    const accountType = String(formData.get('accountType') || 'artist') as AccountType
    const country = String(formData.get('country') || '')
    // Genre is collected at signup so releases can later be searched by musical style.
    const genre = String(formData.get('genre') || '')

    try {
      const result = await registerCreator({
        accountType,
        country,
        email,
        genre,
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
          What is your Name dude?
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
          Pick your account type
        </label>
        <select
          className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground outline-none"
          defaultValue="artist"
          id="accountType"
          name="accountType"
          // Account type is required because it defines the creator profile from signup.
          required
        >
          <option value="artist">Artist</option>
          <option value="band">Band</option>
          <option value="label">Label</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="country">
          Enter your country
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground outline-none"
          id="country"
          name="country"
          placeholder="Colombia, Mexico, USA, etc..."
          required
          type="text"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="genre">
          Now your music genre
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground outline-none"
          id="genre"
          name="genre"
          placeholder="Indie Rock, Aafrobeats, Champeta, Reggaeton, etc..."
          required
          type="text"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="email">
          Your email here
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
          And your password
        </label>
        <div className="relative">
          <input
            className="h-12 w-full border border-border bg-background px-4 pr-20 text-sm text-foreground outline-none"
            id="password"
            minLength={8}
            name="password"
            placeholder="At least 8 characters"
            required
            type={showPassword ? 'text' : 'password'}
          />
          <button
            aria-controls="password"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 px-4 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="password">
          *All fields are required
        </label>
      </div>

      {error && (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </p>
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
