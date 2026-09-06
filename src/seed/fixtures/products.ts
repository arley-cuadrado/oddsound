export type ProductFixture = {
  /** Slug of the owning artist, used to resolve owner and profile. */
  artistSlug: string
  description: string
  priceInCOP: number
  productType: 'digital' | 'physical'
  /** Slug of the release this product hangs off, so the shop links back to it. */
  releaseSlug: string
  slug: string
  title: string
}

/**
 * Prices are whole pesos, which is what the store holds: COP is configured with
 * zero decimals, so a minor unit is a peso.
 *
 * Three artists carry merch on purpose. Connect two of them to Mercado Pago
 * test accounts and leave the third alone, and a single cart then exercises both
 * the payable and the blocked group states.
 */
export const products: ProductFixture[] = [
  {
    artistSlug: 'los-petirrojos',
    description: 'Vinilo de 180 gramos, edición limitada de 300 copias numeradas a mano.',
    priceInCOP: 120000,
    productType: 'physical',
    releaseSlug: 'los-petirrojos-noche-larga',
    slug: 'los-petirrojos-noche-larga-vinilo',
    title: 'Noche Larga — Vinilo',
  },
  {
    artistSlug: 'los-petirrojos',
    description: 'Camiseta serigrafiada a mano sobre algodón orgánico. Tallas S a XL.',
    priceInCOP: 90000,
    productType: 'physical',
    releaseSlug: 'los-petirrojos-mapa-roto',
    slug: 'los-petirrojos-camiseta',
    title: 'Camiseta Mapa Roto',
  },
  {
    artistSlug: 'sonora-azul',
    description: 'Vinilo doble con dos temas extra grabados en el puerto.',
    priceInCOP: 150000,
    productType: 'physical',
    releaseSlug: 'sonora-azul-mar-adentro',
    slug: 'sonora-azul-mar-adentro-vinilo',
    title: 'Mar Adentro — Vinilo doble',
  },
  {
    artistSlug: 'sonora-azul',
    description: 'Descarga en WAV y MP3 más el cuadernillo digital de la grabación.',
    priceInCOP: 35000,
    productType: 'digital',
    releaseSlug: 'sonora-azul-radio-costera',
    slug: 'sonora-azul-radio-costera-digital',
    title: 'Radio Costera — Pack digital',
  },
  {
    artistSlug: 'mila-ferreyra',
    description: 'Cuaderno de partituras impreso en risografía, con notas de sesión.',
    priceInCOP: 65000,
    productType: 'physical',
    releaseSlug: 'mila-ferreyra-tinta-china',
    slug: 'mila-ferreyra-cuaderno',
    title: 'Tinta China — Cuaderno',
  },
]
