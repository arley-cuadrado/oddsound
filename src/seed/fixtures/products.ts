export type ProductFixture = {
  /** Slug of the owning artist, used to resolve owner and profile. */
  artistSlug: string
  description: string
  priceInUSD: number
  productType: 'digital' | 'physical'
  /** Slug of the release this product hangs off, so the shop links back to it. */
  releaseSlug: string
  slug: string
  title: string
}

/**
 * Seeded with `checkoutProvider: 'other'` on purpose: a Mercado Pago button
 * needs a real OAuth connection behind it, and one that fails when clicked is
 * worse than none.
 */
export const products: ProductFixture[] = [
  {
    artistSlug: 'los-petirrojos',
    description: 'Vinilo de 180 gramos, edición limitada de 300 copias numeradas a mano.',
    priceInUSD: 32,
    productType: 'physical',
    releaseSlug: 'los-petirrojos-noche-larga',
    slug: 'los-petirrojos-noche-larga-vinilo',
    title: 'Noche Larga — Vinilo',
  },
  {
    artistSlug: 'los-petirrojos',
    description: 'Camiseta serigrafiada a mano sobre algodón orgánico. Tallas S a XL.',
    priceInUSD: 24,
    productType: 'physical',
    releaseSlug: 'los-petirrojos-mapa-roto',
    slug: 'los-petirrojos-camiseta',
    title: 'Camiseta Mapa Roto',
  },
  {
    artistSlug: 'sonora-azul',
    description: 'Vinilo doble con dos temas extra grabados en el puerto.',
    priceInUSD: 30,
    productType: 'physical',
    releaseSlug: 'sonora-azul-mar-adentro',
    slug: 'sonora-azul-mar-adentro-vinilo',
    title: 'Mar Adentro — Vinilo doble',
  },
  {
    artistSlug: 'sonora-azul',
    description: 'Descarga en WAV y MP3 más el cuadernillo digital de la grabación.',
    priceInUSD: 9,
    productType: 'digital',
    releaseSlug: 'sonora-azul-radio-costera',
    slug: 'sonora-azul-radio-costera-digital',
    title: 'Radio Costera — Pack digital',
  },
]
