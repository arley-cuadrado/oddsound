import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'

import { CommerceOverview } from './CommerceOverview'
import { MercadoPagoConnectionCard } from './MercadoPagoConnectionCard'
import { OrdersTable } from './OrdersTable'
import { ShippingSettingsCard } from './ShippingSettingsCard'
import { listArtistOrders } from '@/utilities/commerceOrders'
import { getMerchOnboarding } from '@/utilities/merchOnboarding'
import { listCommerceProducts, resolveUserProfileID } from '@/utilities/commerceProducts'
import { getMeUser } from '@/utilities/getMeUser'
import { isFanUser } from '@/utilities/isEditorialUser'
import {
  findCreatorProfileByID,
  sanitizeMercadoPagoConnection,
} from '@/utilities/mercadoPagoOAuth'

export default async function CreatorDashboardPage() {
  const { user } = await getMeUser({
    nullUserRedirect: '/creator/login',
  })

  if (isFanUser(user)) {
    redirect('/fan/account')
  }

  const payload = await getPayload({ config })
  const profileID = resolveUserProfileID(user)
  const profile = profileID
    ? await findCreatorProfileByID({
        id: String(profileID),
        payload,
      })
    : null
  const products = await listCommerceProducts({
    includeDrafts: true,
    ownerID: user.role === 'admin' ? null : String(user.id),
    payload,
    profile: profileID,
  })
  const orders = profileID
    ? await listArtistOrders({ payload, profileID: String(profileID) })
    : []
  const merch = getMerchOnboarding({
    hasPublishedProduct: products.some((product) => product.status === 'published'),
    profile,
  })
  const publicProfileSlug =
    (typeof user.profile === 'object' && user.profile && 'slug' in user.profile
      ? user.profile.slug
      : null) ||
    products.find((product) => product.profile?.slug)?.profile?.slug ||
    null

  return (
    <main className="min-h-dvh bg-background px-6 py-16">
      <div className="mx-auto max-w-[72rem] space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Panel de artista
            </p>
            <h1 className="text-3xl font-medium tracking-tight text-foreground">
              {profile?.displayName || user.name || 'Tu perfil'}
            </h1>
            <p className="text-[13px] text-muted-foreground">{user.email}</p>
          </div>

          {/* Both of these lead away from this page, so neither competes with the
              actions inside the cards below. */}
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-[13px] font-medium text-foreground transition hover:bg-muted"
              href="/dashboard"
            >
              Editar mi contenido
            </Link>
            {publicProfileSlug ? (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-[13px] font-medium text-foreground transition hover:bg-muted"
                href={`/${publicProfileSlug}/shop`}
              >
                Ver mi shop
              </Link>
            ) : null}
          </div>
        </header>

        <MercadoPagoConnectionCard
          connection={sanitizeMercadoPagoConnection(profile)}
          merch={merch}
          profileSlug={publicProfileSlug}
        />

        <ShippingSettingsCard
          initialNotes={profile?.commerce?.shippingNotes || ''}
          initialRate={profile?.commerce?.shippingFlatRateCOP || 0}
        />

        <OrdersTable orders={orders} />

        <CommerceOverview products={products} />
      </div>
    </main>
  )
}
