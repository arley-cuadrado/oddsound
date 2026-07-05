import type { Metadata } from 'next'
import Link from 'next/link'
import { ArloSignature } from '../ArloSignature'
import { LegalDocument } from '../legal/LegalDocument'
import { aboutUsIntro, aboutUsIntroTitle, aboutUsUpdatedAt } from './content'
import { ABOUT_US_DESCRIPTION, SITE_NAME } from '@/seo/site'

export const metadata: Metadata = {
  title: `${SITE_NAME} About Us`,
  description: ABOUT_US_DESCRIPTION,
  alternates: {
    canonical: '/about-us',
  },
}

const sections = [
  {
    title: 'Cosas como:',
    body: [
      'Tener parte de tu estrategía de marketing en tiktok, instagram, pero a la vez usar youtube para ver videos y las diversas plataformas de streaming musicales a las que hay que tener acceso para escucharte, hacen que el proceso de descubrimiento sea un tanto extenso, por lo que, por qué no tener un espacio que pueda funcionar como sitio web o landing page donde puedas sintetizar todo eso? Ojo! SINTETIZAR…',
      'Puede que a primera vista el sitio no resulte en algo innovador y es que tampoco lo pretende, solo quiere decirle a los independientes:',
      <em key="about-us-quote">
        “Hey, estoy aquí! Llégate y sube tu info y lanzamientos si quieres, si puedes y si te da la
        gana… no pierdes na’, a la final todos moriremos.”
      </em>,
    ],
  },
  {
    title: 'Es gratis...',
    body: ['Es la primera versión de la plataforma, por lo que puede que haya cosas por pulir.'],
  },
  {
    title: '',
    body: [
      <>
        Si ves detalles de diseño o mejoras de funcionalidad que se deban ajustar, escríbeme a{' '}
        <Link
          className="underline underline-offset-2 title"
          href="mailto:hello@oddsound.co"
        >
          hello@oddsound.co
        </Link>
        , con gusto lo revisaré y corregiré, a menos que se acabe el mundo en ese proceso.
      </>,
      <ArloSignature />,
    ],
  },
]

export default function AboutUsPage() {
  return (
    <LegalDocument
      intro={aboutUsIntro}
      introTitle={aboutUsIntroTitle}
      sections={sections}
      title="Sobre Oddsound"
      updatedAt={aboutUsUpdatedAt}
    />
  )
}
