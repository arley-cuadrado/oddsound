import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { CommerceOverview } from './CommerceOverview'
import { PaymentsOverview } from './PaymentsOverview'
import { listCommerceProducts, resolveUserProfileID } from '@/utilities/commerceProducts'
import { getMeUser } from '@/utilities/getMeUser'
import { getMarketplaceSettings } from '@/utilities/marketplaceSettings'
import {
  findSellerPaymentAccountByOwner,
  sanitizeSellerPaymentAccount,
} from '@/utilities/marketplaceSellerAccounts'

export default async function CreatorDashboardPage() {
  const { user } = await getMeUser({
    nullUserRedirect: '/creator/login',
  })
  const payload = await getPayload({ config })
  const profileID = resolveUserProfileID(user)
  const sellerAccount = await findSellerPaymentAccountByOwner({
    ownerID: String(user.id),
    payload,
  })
  const marketplaceSettings = await getMarketplaceSettings(payload)
  const products = await listCommerceProducts({
    includeDrafts: true,
    ownerID: user.role === 'admin' ? null : String(user.id),
    payload,
    profile: profileID,
  })
  const publicProfileSlug =
    (typeof user.profile === 'object' && user.profile && 'slug' in user.profile
      ? user.profile.slug
      : null) ||
    products.find((product) => product.profile?.slug)?.profile?.slug ||
    null

  return (
    <main className="bg-[radial-gradient(circle_at_top,#f5efe7_0%,#fbfaf7_50%,#f2eee8_100%)] px-6 py-16">
      <div className="mx-auto max-w-[72rem] space-y-8">
        <div className="space-y-2">
          <p className="text-[13px] text-foreground/80">Sesion iniciada</p>
          <h1 className="text-3xl font-medium text-foreground">
            Hola{user.name ? `, ${user.name}` : ''}.
          </h1>
          <p className="max-w-[48rem] text-[13px] leading-6 text-foreground/80">
            Tu cuenta de creador está activa. Este panel ya te deja inspeccionar el catalogo oculto
            del ecommerce oficial y consumir su capa de lectura desde remoto.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-3 rounded-[28px] border border-border/70 bg-white/75 p-6 text-[13px] text-foreground/80 shadow-[0_18px_60px_rgba(49,46,46,0.08)] backdrop-blur">
            <p>Correo: {user.email}</p>
            <p>Rol: {user.role || 'creator'}</p>
            <p>Profile ID: {profileID || 'Sin perfil vinculado'}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-[18px] bg-[#312e2e] px-4 text-[13px] font-medium text-white"
              href="/dashboard"
            >
              Ir al dashboard del artista
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-[18px] border border-border bg-background px-4 text-[13px] font-medium text-foreground"
              href="/search"
            >
              Explorar lanzamientos
            </Link>
          </div>
        </div>

        <CommerceOverview
          apiPath="/creator-api/commerce/products"
          products={products}
          profileSlug={publicProfileSlug}
        />

        <PaymentsOverview
          platformFeePercent={marketplaceSettings.platformFeePercent}
          sellerAccount={sanitizeSellerPaymentAccount(sellerAccount)}
        />
      </div>
    </main>
  )
}
