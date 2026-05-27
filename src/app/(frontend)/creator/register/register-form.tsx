'use client'

import { registerCreator } from '@/app/(frontend)/creator/actions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

type AccountType = 'artist' | 'band'

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
    const acceptedLegal = formData.get('acceptedLegal') === 'on'
    const country = String(formData.get('country') || '')
    // Genre is collected at signup so releases can later be searched by musical style.
    const genre = String(formData.get('genre') || '')

    try {
      const result = await registerCreator({
        acceptedLegal,
        accountType,
        country,
        email,
        genre,
        name,
        password,
      })

      if (!result.ok) {
        throw new Error(parseErrorMessage(result, 'No fue posible crear tu cuenta.'))
      }

      const nextEmail = encodeURIComponent(result.email || email.trim().toLowerCase())

      router.push(`/creator/register/check-email?email=${nextEmail}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Algo salió mal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="name">
          ¿Cuál es tu nombre?
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-[13px] text-foreground outline-none placeholder:text-[13px]"
          id="name"
          name="name"
          placeholder="Artista o Banda"
          required
          type="text"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="accountType">
          Elige tu tipo de cuenta
        </label>
        <select
          className="h-12 w-full border border-border bg-background px-4 text-[13px] text-foreground outline-none"
          defaultValue="artist"
          id="accountType"
          name="accountType"
          // Account type is required because it defines the creator profile from signup.
          required
        >
          <option value="artist">Artista</option>
          <option value="band">Banda</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="country">
          Ingresa tu país
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-[13px] text-foreground outline-none placeholder:text-[13px]"
          id="country"
          name="country"
          placeholder="Colombia, México, EE. UU., etc..."
          required
          type="text"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="genre">
          Ahora tu género musical
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-[13px] text-foreground outline-none placeholder:text-[13px]"
          id="genre"
          name="genre"
          placeholder="Indie Rock, Afrobeats, Champeta, Reggaetón, etc..."
          required
          type="text"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="email">
          Tu correo electrónico
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-[13px] text-foreground outline-none placeholder:text-[13px]"
          id="email"
          name="email"
          placeholder="name@mail.com"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="password">
          Y tu contraseña
        </label>
        <div className="relative">
          <input
            className="h-12 w-full border border-border bg-background px-4 pr-20 text-[13px] text-foreground outline-none placeholder:text-[13px]"
            id="password"
            minLength={8}
            name="password"
            placeholder="Mínimo 8 caracteres"
            required
            type={showPassword ? 'text' : 'password'}
          />
          <button
            aria-controls="password"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            className="absolute inset-y-0 right-0 px-4 text-[13px] text-[#777] hover:text-slate-900 dark:text-[#858c98] dark:hover:text-white"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="password">
          *Todos los campos son obligatorios
        </label>
      </div>

      <div className="flex items-start gap-3 border border-border px-4 py-4">
        <input
          className="mt-1 h-4 w-4 shrink-0"
          id="acceptedLegal"
          name="acceptedLegal"
          required
          type="checkbox"
        />
        <label className="text-[13px] leading-6 text-foreground/80" htmlFor="acceptedLegal">
          He leído y acepto los{' '}
          <Link
            className="text-[13px] underline underline-offset-2"
            href="/terms-and-conditions"
            target="_blank"
          >
            Términos y condiciones
          </Link>{' '}
          y la{' '}
          <Link
            className="text-[13px] underline underline-offset-2"
            href="/privacy-policy"
            target="_blank"
          >
            Política de privacidad
          </Link>
          .
        </label>
      </div>

      {error && (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <button
        className="mt-2 h-12 w-full bg-[#312e2e] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  )
}
