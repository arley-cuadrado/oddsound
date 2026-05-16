import Link from 'next/link'
import { ArloSignature } from '../ArloSignature'
import { LegalDocument } from '../legal/LegalDocument'
import { aboutUsIntro, aboutUsIntroTitle, aboutUsUpdatedAt } from './content'

const sections = [
  {
    title: 'Cosas como:',
    body: [
      'Tener parte de tu estrategía de marketing en tiktok, instagram, pero a la vez usar youtube para ver videos y las diversas plataformas de streaming musicales a las que hay que tener acceso para escucharte, hacen que el proceso de descubrimiento sea un tanto extenso, por lo que, por qué no tener un espacio que pueda funcionar como sitio web o landing page donde puedas sintetizar todo eso? Ojo! SINTETIZAR…',
      'Puede que a primera vista el sitio no resulte en algo innovador y es que tampoco lo pretende, solo quiere decirle a los independientes:',
      '“Hey, estoy aquí! Llégate y sube tu info y lanzamientos si quieres, si puedes y si te da la gana… no pierdes na’, a la final todos moriremos.”',
    ],
  },
  {
    title: 'Es gratis...',
    body: ['Es la primera versión del sitio, por lo que puede que haya cosas por pulir.'],
  },
  {
    title: '',
    body: [
      <>
        Si ves detalles de diseño o mejoras de funcionalidad que se deban ajustar{' '}
        <Link
          className="underline underline-offset-2 title"
          href="mailto:arley.cuadrado@icloud.com"
        >
          oddsound-support
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
      title="About Oddsound"
      updatedAt={aboutUsUpdatedAt}
    />
  )
}
