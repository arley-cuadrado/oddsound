import { getServerSideURL } from '@/utilities/getURL'

export const SITE_NAME = 'ODDSOUND'
export const SITE_TITLE = 'Oddsound - Be heard. Stay odd.'
export const HOME_DESCRIPTION =
  'Esta es una versión temprana del sitio, un espacio donde encontrarás artistas independientes.'
export const DISCOVERY_DESCRIPTION =
  'Explora música más allá de lo usual. Encuentra artistas, lanzamientos y escenas conectadas por lugares e identidad. Ingresa el género musical, país, banda o nombre del álbum...'
export const ABOUT_US_DESCRIPTION =
  'Conoce Oddsound, una plataforma pensada para descubrir artistas independientes, sintetizar su presencia digital y conectar lanzamientos, escenas e identidad.'
export const LOGIN_DESCRIPTION =
  'Inicia sesión en Oddsound para gestionar tu perfil de creador, tus lanzamientos y tu presencia pública.'
export const REGISTER_DESCRIPTION =
  'Crea tu cuenta de creador en Oddsound para publicar tu perfil, compartir tus lanzamientos y construir tu espacio.'
export const INSTAGRAM_URL = 'https://www.instagram.com/arlo_cuadrado/'
export const FOUNDER_NAME = 'Arlo Cuadrado'

export const STATIC_SITEMAP_PATHS = ['/', '/about-us', '/search', '/posts', '/creator/login', '/creator/register']

export function getStaticSitemapEntries(lastmod: string) {
  const siteURL = getServerSideURL()

  return STATIC_SITEMAP_PATHS.map((path) => ({
    lastmod,
    loc: path === '/' ? siteURL : `${siteURL}${path}`,
  }))
}

export function getSiteStructuredData() {
  const siteURL = getServerSideURL()

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: siteURL,
      description: HOME_DESCRIPTION,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteURL}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteURL,
      sameAs: [INSTAGRAM_URL],
      founder: {
        '@type': 'Person',
        name: FOUNDER_NAME,
        sameAs: INSTAGRAM_URL,
        jobTitle: 'Founder / Content Creator',
      },
    },
  ]
}
