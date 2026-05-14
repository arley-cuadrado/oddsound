import type { Metadata } from 'next'

import { LegalDocument } from '../legal/LegalDocument'

const updatedAt = '14 de mayo de 2026'

const intro = [
  'Esta Política de Privacidad explica cómo Oddsound recopila, usa, almacena y protege datos personales de artistas, colaboradores y visitantes del sitio. Oddsound opera desde Colombia como proyecto digital independiente y trata datos personales en la medida necesaria para ofrecer sus servicios.',
  'Al utilizar la plataforma, registrarte, publicar contenido o navegar por el sitio, aceptas el tratamiento de datos descrito en esta política, sin perjuicio de los derechos que te reconoce la legislación aplicable en Colombia y, cuando corresponda, otras normas imperativas.',
]

const sections = [
  {
    title: '1. Responsable del tratamiento',
    body: [
      'El responsable del tratamiento de los datos personales es el operador de Oddsound, proyecto digital administrado desde Colombia. Mientras la plataforma no se encuentre formalmente constituida como sociedad, el tratamiento será realizado por la persona natural responsable de su administración.',
      'Los canales de contacto vigentes para consultas, solicitudes o reclamos relacionados con privacidad serán los publicados en el sitio o en los medios oficiales de Oddsound.',
    ],
  },
  {
    title: '2. Qué datos podemos recopilar',
    body: [
      'Podemos recopilar datos de identificación y contacto proporcionados por los usuarios al crear cuentas, solicitar acceso, enviar formularios o mantener comunicación con la plataforma. Esto puede incluir nombre, correo electrónico, nombre artístico, enlaces a redes o plataformas externas y otra información de perfil.',
      'También podemos recopilar información asociada al contenido que los artistas o usuarios publiquen por cuenta propia, como textos descriptivos, portadas, imágenes, enlaces a Spotify, enlaces a YouTube, videos, eventos, ciudades, géneros u otros elementos editoriales o promocionales.',
      'De forma automática, podemos recolectar ciertos datos técnicos de navegación, como dirección IP, navegador, dispositivo, idioma, páginas visitadas, tiempos de interacción, rutas de acceso y eventos de uso mediante herramientas analíticas o técnicas del sitio.',
    ],
  },
  {
    title: '3. Finalidades del tratamiento',
    body: [
      'Usamos los datos personales para operar la plataforma, permitir el acceso a cuentas, administrar perfiles de artistas, publicar contenido, facilitar la navegación, mantener la seguridad del sitio y responder a solicitudes o comunicaciones.',
      'También usamos la información para fines editoriales y de visibilidad dentro de Oddsound, por ejemplo al mostrar perfiles, lanzamientos, escenas musicales, eventos relacionados y enlaces a contenidos compartidos por los propios artistas.',
      'Adicionalmente, podremos utilizar datos de uso y navegación para comprender cómo interactúan los visitantes con el sitio, mejorar la experiencia, evaluar el rendimiento de contenidos y tomar decisiones de producto o crecimiento de la plataforma.',
    ],
  },
  {
    title: '4. Base del tratamiento',
    body: [
      'El tratamiento de datos podrá basarse en la autorización otorgada por el titular, en la necesidad de ejecutar la relación generada por el uso de la plataforma, en el interés legítimo del operador para administrar y mejorar el servicio o en cualquier otra base válida conforme a la normativa aplicable.',
      'Cuando sea necesario, la plataforma podrá solicitar autorizaciones adicionales para tratamientos específicos, especialmente si se incorporan nuevas funcionalidades o procesos distintos a los aquí descritos.',
    ],
  },
  {
    title: '5. Contenido publicado por artistas y usuarios',
    body: [
      'Los artistas y usuarios son responsables de la información, imágenes, enlaces y material que publiquen en Oddsound. Al subir dicho contenido, declaran contar con autorización suficiente para compartirlo y para permitir que la plataforma lo muestre al público.',
      'Oddsound tratará ese contenido como parte del servicio solicitado por el usuario y lo usará para su publicación dentro del sitio, sus listados, sus páginas derivadas y otras superficies editoriales relacionadas con la plataforma.',
    ],
  },
  {
    title: '6. Google Analytics y cookies',
    body: [
      'Oddsound podrá implementar Google Analytics u otras herramientas similares para medir tráfico, comportamiento de navegación y rendimiento del sitio. Estas herramientas pueden usar cookies u otros identificadores técnicos para recopilar información sobre la interacción de los usuarios con la plataforma.',
      'Las cookies pueden servir para funciones técnicas del sitio, autenticación, seguridad, continuidad de sesión y análisis estadístico. Si en el futuro se incorporan categorías adicionales de cookies o herramientas publicitarias, esta política podrá actualizarse y, cuando aplique, se solicitarán los consentimientos correspondientes.',
    ],
  },
  {
    title: '7. Servicios de terceros',
    body: [
      'Oddsound puede integrar servicios, reproductores o enlaces de terceros, incluyendo Spotify, YouTube, sistemas de correo, herramientas analíticas y plataformas externas de eventos o boletería.',
      'Cuando el usuario interactúa con dichos servicios, la información puede ser tratada también por esos terceros conforme a sus propias políticas. Oddsound no controla directamente el tratamiento que realizan esas plataformas fuera de su propio entorno.',
    ],
  },
  {
    title: '8. Compartición de datos',
    body: [
      'Oddsound no vende datos personales. Sin embargo, puede compartir información con proveedores tecnológicos, servicios de hosting, analítica, autenticación, mantenimiento, moderación o soporte, en la medida necesaria para operar la plataforma.',
      'También podrá divulgar información cuando exista obligación legal, requerimiento de autoridad competente, necesidad de proteger derechos propios o de terceros, o cuando ello resulte necesario para prevenir fraude, abuso o riesgos de seguridad.',
    ],
  },
  {
    title: '9. Conservación de la información',
    body: [
      'Los datos se conservarán durante el tiempo necesario para cumplir las finalidades descritas en esta política, prestar el servicio, atender obligaciones legales, resolver disputas o mantener trazabilidad mínima de seguridad y operación.',
      'Cuando un usuario solicite el cierre de su cuenta o el retiro de información, Oddsound podrá conservar ciertos datos de forma limitada cuando exista una razón técnica, legal o legítima para ello.',
    ],
  },
  {
    title: '10. Derechos de los titulares',
    body: [
      'De acuerdo con la legislación aplicable, los titulares de datos personales podrán solicitar acceso, actualización, rectificación o supresión de su información, así como revocar autorizaciones cuando proceda y presentar consultas o reclamos sobre el tratamiento realizado.',
      'Para ejercer estos derechos, el titular deberá utilizar los canales de contacto publicados por Oddsound y aportar la información mínima necesaria para verificar su identidad y procesar la solicitud.',
    ],
  },
  {
    title: '11. Seguridad de la información',
    body: [
      'Oddsound adopta medidas razonables de carácter técnico, organizativo y operativo para proteger la información frente a accesos no autorizados, pérdida, alteración, divulgación indebida o usos incompatibles con esta política.',
      'No obstante, ningún sistema es completamente infalible y la plataforma no puede garantizar seguridad absoluta frente a incidentes derivados de terceros, vulnerabilidades tecnológicas o conductas maliciosas externas.',
    ],
  },
  {
    title: '12. Menores de edad',
    body: [
      'Oddsound no está diseñada prioritariamente para menores de edad. Si un menor utiliza la plataforma, deberá hacerlo con la autorización y supervisión de su representante legal cuando la normativa aplicable así lo requiera.',
      'Si se detecta tratamiento indebido de datos de menores sin la autorización correspondiente, la plataforma podrá adoptar medidas para restringir o eliminar dicho contenido o cuenta.',
    ],
  },
  {
    title: '13. Transferencias internacionales',
    body: [
      'Dado que algunos proveedores tecnológicos, plataformas de analítica o servicios de terceros pueden operar desde otros países, cierta información podría ser tratada o almacenada fuera de Colombia.',
      'En esos casos, Oddsound procurará utilizar proveedores reconocidos y adoptar medidas razonables para que el tratamiento se realice con estándares adecuados de seguridad y privacidad, en la medida aplicable.',
    ],
  },
  {
    title: '14. Cambios en esta política',
    body: [
      'Oddsound podrá actualizar esta Política de Privacidad cuando cambien sus procesos internos, la tecnología utilizada, las funcionalidades del sitio o las obligaciones legales aplicables. La versión vigente será la publicada en la plataforma con su respectiva fecha de actualización.',
    ],
  },
  {
    title: '15. Alcance del documento',
    body: [
      'Esta política constituye una base operativa para la etapa actual del proyecto. Si Oddsound se constituye formalmente, incorpora pagos directos, nuevas integraciones comerciales o mecanismos avanzados de monetización, este documento deberá ajustarse para reflejar esos cambios con mayor precisión.',
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      intro={intro}
      sections={sections}
      title="Política de Privacidad"
      updatedAt={updatedAt}
    />
  )
}

export const metadata: Metadata = {
  description: 'Política de privacidad de Oddsound.',
  title: 'Política de Privacidad | Oddsound',
}
