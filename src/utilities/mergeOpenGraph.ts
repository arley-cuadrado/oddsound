import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: 'Oddsound - Be heard. Stay odd.',
  images: [
    {
      url: `${getServerSideURL()}/oddsound_main_share_image.jpg`,
    },
  ],
  siteName: 'Oddsound',
  title: 'Oddsound - Be heard. Stay odd.',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
