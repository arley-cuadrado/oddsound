import type { Metadata } from 'next'

import { LegalDocument } from '../legal/LegalDocument'

const updatedAt = '14 de mayo de 2026'

const intro = [
  'Estos Términos y Condiciones regulan el acceso, navegación y uso de Oddsound, una plataforma digital operada desde Colombia como proyecto independiente en etapa temprana de desarrollo. Al acceder al sitio o crear una cuenta, aceptas estas condiciones.',
  'Oddsound funciona como un espacio de descubrimiento musical y publicación de contenido relacionado con artistas, lanzamientos y escenas musicales. Por el momento, la plataforma no procesa pagos directos y puede incluir enlaces, integraciones o reproductores de servicios de terceros como Spotify, YouTube u otros sitios externos.',
]

const sections = [
  {
    title: '1. Operador de la plataforma',
    body: [
      'Oddsound es un proyecto digital operado desde Colombia. Mientras la plataforma no se encuentre constituida como empresa, las referencias a “Oddsound”, “la plataforma”, “nosotros” o “el operador” se entienden hechas a la persona natural responsable de su administración y operación.',
      'La información de contacto y los canales vigentes de comunicación serán los publicados dentro del sitio o en los canales oficiales asociados al proyecto.',
    ],
  },
  {
    title: '2. Objeto del servicio',
    body: [
      'Oddsound permite la creación y gestión de perfiles de artistas, bandas o proyectos musicales, así como la publicación de información, imágenes, textos, enlaces y contenido promocional relacionado con lanzamientos musicales y escenas culturales.',
      'La plataforma también puede publicar contenido editorial propio o realizado por colaboradores invitados, incluyendo artículos, reseñas, recomendaciones, coberturas de escenas y promoción de eventos vinculados al ecosistema musical.',
    ],
  },
  {
    title: '3. Registro y cuentas',
    body: [
      'Para acceder a ciertas funciones, algunos usuarios podrán crear una cuenta. Cada usuario es responsable de la veracidad de la información suministrada, de mantener la confidencialidad de sus credenciales y de todas las actividades que se realicen desde su cuenta.',
      'Oddsound podrá suspender, restringir o eliminar cuentas cuando detecte uso fraudulento, suplantación, actividad abusiva, vulneración de derechos de terceros o incumplimiento de estos términos.',
    ],
  },
  {
    title: '4. Contenido subido por artistas y usuarios',
    body: [
      'Los artistas y usuarios que publiquen contenido en Oddsound declaran que cuentan con los derechos, permisos o autorizaciones necesarios para usar y compartir dicho contenido, incluyendo textos, nombres artísticos, fotografías, portadas, artes gráficas, enlaces, videos y material promocional.',
      'El usuario es el único responsable por el contenido que suba o publique. Oddsound no revisa de forma previa cada publicación y no garantiza la exactitud, legalidad o disponibilidad permanente del contenido compartido por terceros.',
      'Oddsound podrá retirar contenido o bloquear publicaciones cuando, a su criterio razonable, exista riesgo de infracción de derechos de autor, uso no autorizado de imagen o marca, contenido ilícito, engañoso, discriminatorio, violento, difamatorio o que afecte el funcionamiento de la plataforma.',
    ],
  },
  {
    title: '5. Licencia de uso del contenido',
    body: [
      'Al publicar contenido en Oddsound, el usuario otorga al operador una licencia no exclusiva, gratuita, revocable y limitada al funcionamiento de la plataforma para alojar, reproducir, adaptar técnicamente, comunicar públicamente y mostrar dicho contenido dentro del sitio, sus páginas derivadas y materiales promocionales asociados a Oddsound.',
      'Esta licencia se entiende únicamente en la medida necesaria para operar, promocionar y difundir el contenido dentro del ecosistema de la plataforma, y no implica transferencia de titularidad sobre los derechos del usuario.',
    ],
  },
  {
    title: '6. Servicios y enlaces de terceros',
    body: [
      'Oddsound puede incorporar enlaces externos, reproductores embebidos o referencias a plataformas de terceros, incluyendo Spotify, YouTube, redes sociales, sistemas de boletería y páginas de eventos.',
      'El acceso, uso y disponibilidad de estos servicios externos dependen exclusivamente de sus propios términos, políticas y condiciones técnicas. Oddsound no controla ni asume responsabilidad por el contenido, la continuidad, las prácticas de privacidad o las transacciones que se realicen fuera de la plataforma.',
    ],
  },
  {
    title: '7. Eventos y boletería',
    body: [
      'Cuando Oddsound publique información sobre eventos, fechas, venues, preventas o enlaces de compra, dicha información podrá provenir de artistas, aliados, organizadores o terceros vinculados a la escena musical.',
      'Oddsound no organiza ni gestiona pagos directos por boletería en esta etapa del proyecto. Las compras, reservas o transacciones vinculadas a eventos se realizan directamente con el tercero correspondiente y bajo su exclusiva responsabilidad.',
    ],
  },
  {
    title: '8. Usos prohibidos',
    body: [
      'No está permitido usar Oddsound para publicar contenido ilegal, engañoso, ofensivo, discriminatorio, difamatorio, amenazante, malicioso o que infrinja derechos de autor, derechos de imagen, marcas, secretos comerciales o cualquier otro derecho de terceros.',
      'Tampoco está permitido intentar acceder sin autorización a cuentas ajenas, alterar el funcionamiento del sitio, recolectar datos de otros usuarios sin base legítima, automatizar de manera abusiva el acceso a la plataforma o utilizarla con fines fraudulentos.',
    ],
  },
  {
    title: '9. Propiedad intelectual de Oddsound',
    body: [
      'Salvo indicación en contrario, el diseño del sitio, la estructura de la plataforma, la identidad visual de Oddsound, su selección editorial y los desarrollos propios del servicio están protegidos por la normativa aplicable sobre propiedad intelectual.',
      'Nada de lo contenido en estos términos concede al usuario licencias o derechos de explotación sobre los activos propios de la plataforma, salvo autorización previa y expresa del operador.',
    ],
  },
  {
    title: '10. Disponibilidad y cambios del servicio',
    body: [
      'Oddsound podrá modificar, suspender, limitar o discontinuar funcionalidades del sitio, ya sea de forma temporal o permanente, sin obligación de mantener una disponibilidad continua o sin errores.',
      'Asimismo, el operador podrá actualizar estos términos cuando resulte necesario por cambios funcionales, técnicos, legales o estratégicos de la plataforma. La fecha de última actualización será informada al inicio del documento.',
    ],
  },
  {
    title: '11. Limitación de responsabilidad',
    body: [
      'Oddsound se ofrece en el estado en que se encuentra disponible. En la medida permitida por la ley aplicable, el operador no garantiza que el servicio estará libre de interrupciones, errores, pérdidas de datos o incompatibilidades con sistemas externos.',
      'El operador no será responsable por daños indirectos, pérdida de oportunidades, interrupciones comerciales, decisiones tomadas con base en contenido publicado por terceros ni por consecuencias derivadas del uso de servicios externos enlazados o embebidos desde la plataforma.',
    ],
  },
  {
    title: '12. Terminación y retiro de contenido',
    body: [
      'Oddsound podrá suspender o terminar el acceso de un usuario cuando exista incumplimiento de estos términos, requerimiento legal o riesgo para la seguridad, operación o reputación de la plataforma.',
      'El usuario también podrá solicitar el retiro de su contenido o el cierre de su cuenta, sujeto a los tiempos razonables de gestión técnica y a la conservación mínima de información requerida por motivos legales, de seguridad o trazabilidad.',
    ],
  },
  {
    title: '13. Ley aplicable y jurisdicción',
    body: [
      'Estos Términos y Condiciones se interpretan conforme a la legislación de la República de Colombia.',
      'Cualquier controversia relacionada con el uso de Oddsound intentará resolverse inicialmente de manera directa entre las partes. Si ello no es posible, se someterá a las autoridades competentes de Colombia, salvo disposición legal imperativa en contrario.',
    ],
  },
  {
    title: '14. Naturaleza informativa del documento',
    body: [
      'Este texto constituye una base operativa para el funcionamiento actual de la plataforma y podrá actualizarse a medida que Oddsound evolucione, se constituya formalmente o incorpore nuevas funciones como pagos directos, campañas promocionales, membresías u otras integraciones.',
    ],
  },
]

export default function TermsAndConditionsPage() {
  return (
    <LegalDocument
      intro={intro}
      sections={sections}
      title="Términos y Condiciones"
      updatedAt={updatedAt}
    />
  )
}

export const metadata: Metadata = {
  description: 'Términos y condiciones de uso de Oddsound.',
  title: 'Términos y Condiciones | Oddsound',
}
