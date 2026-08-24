'use client'

import { loginCreator } from '@/app/(frontend)/creator/actions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

export function CreatorLoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')

    try {
      const result = await loginCreator({
        email,
        password,
      })

      if (!result.ok) {
        throw new Error(result.message || 'No fue posible iniciar sesión.')
      }

      router.push('/dashboard')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Algo salió mal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="email">
          Correo electrónico <span className="text-[#ff6a6a]">*</span>
        </label>
        <input
          className="h-12 w-full border border-border bg-background px-4 text-base text-foreground outline-none md:text-[13px]"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="password">
          Contraseña <span className="text-[#ff6a6a]">*</span>
        </label>
        <div className="relative">
          <input
            className="h-12 w-full border border-border bg-background px-4 pr-20 text-base text-foreground outline-none md:text-[13px]"
            id="password"
            name="password"
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

      <p className="text-[13px] text-foreground/80">
        <Link className="underline underline-offset-2" href="/creator/forgot-password">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      {error ? (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <button
        className="mt-2 h-12 w-full bg-[#312e2e] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}
