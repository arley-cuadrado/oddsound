'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

import { resetCreatorPassword } from '@/app/(frontend)/creator/actions'

export function CreatorResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      setIsSubmitting(false)
      return
    }

    try {
      const result = await resetCreatorPassword({
        password,
        token,
      })

      if (!result.ok) {
        throw new Error(result.message || 'No fue posible actualizar tu contraseña.')
      }

      setSuccessMessage(result.message || 'Tu contraseña fue actualizada.')
      setTimeout(() => {
        router.push('/dashboard/login')
      }, 1200)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Algo salió mal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="password">
          Nueva contraseña <span className="text-[#ff6a6a]">*</span>
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

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground" htmlFor="confirmPassword">
          Confirma tu contraseña <span className="text-[#ff6a6a]">*</span>
        </label>
        <div className="relative">
          <input
            className="h-12 w-full border border-border bg-background px-4 pr-20 text-base text-foreground outline-none md:text-[13px]"
            id="confirmPassword"
            name="confirmPassword"
            required
            type={showConfirmPassword ? 'text' : 'password'}
          />
          <button
            aria-controls="confirmPassword"
            aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            className="absolute inset-y-0 right-0 px-4 text-[13px] text-[#777] hover:text-slate-900 dark:text-[#858c98] dark:hover:text-white"
            onClick={() => setShowConfirmPassword((current) => !current)}
            type="button"
          >
            {showConfirmPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <button
        className="mt-2 h-12 w-full bg-[#312e2e] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Actualizando contraseña...' : 'Guardar nueva contraseña'}
      </button>

      <p className="text-[13px] text-foreground/80">
        <Link className="underline underline-offset-2" href="/dashboard/login">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  )
}
