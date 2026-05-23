import Link from 'next/link'

import { getMeUser } from '@/utilities/getMeUser'

export default async function CreatorDashboardPage() {
  const { user } = await getMeUser({
    nullUserRedirect: '/creator/login',
  })

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-[32rem] space-y-6">
        <div className="space-y-2">
          <p className="text-[13px] text-foreground/80">Sesión iniciada</p>
          <h1 className="text-2xl font-medium text-foreground">
            Hola{user.name ? `, ${user.name}` : ''}.
          </h1>
          <p className="text-[13px] leading-6 text-foreground/80">
            Tu cuenta de creador está activa. Estamos dejando listo este espacio para las
            herramientas de gestión del perfil y lanzamientos.
          </p>
        </div>

        <div className="space-y-3 text-[13px] text-foreground/80">
          <p>Correo: {user.email}</p>
          <p>Rol: {user.role || 'creator'}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            className="inline-flex h-12 items-center justify-center bg-[#312e2e] px-4 text-[13px] font-medium text-white"
            href="/dashboard"
          >
            Ir al dashboard del artista
          </Link>
          <Link
            className="inline-flex h-12 items-center justify-center border border-border bg-background px-4 text-[13px] font-medium text-foreground"
            href="/search"
          >
            Explorar lanzamientos
          </Link>
        </div>
      </div>
    </main>
  )
}
