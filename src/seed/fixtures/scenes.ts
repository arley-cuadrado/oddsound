export type SceneFixture = {
  body: string[]
  excerpt: string
  slug: string
  title: string
}

/**
 * Editorial posts. They belong to the seeded admin because `posts` is an
 * admin-only collection.
 */
export const scenes: SceneFixture[] = [
  {
    body: [
      'Durante los últimos cinco años, los sótanos del centro de Bogotá se convirtieron en el circuito más activo de la ciudad.',
      'Sin permisos, sin prensa y casi sin dinero, una docena de bandas construyó un público que llena salas de cien personas cada fin de semana.',
    ],
    excerpt: 'Cómo una docena de bandas construyó un circuito propio sin permisos ni prensa.',
    slug: 'bogota-subterranea',
    title: 'Bogotá subterránea',
  },
  {
    body: [
      'La cumbia dejó de ser un género de bocina y pasó al sintetizador sin perder la pista de baile.',
      'Hablamos con tres proyectos que están reescribiendo el ritmo desde el puerto.',
    ],
    excerpt: 'Del acordeón al sintetizador: tres proyectos que están reescribiendo el ritmo.',
    slug: 'ruta-de-la-cumbia-digital',
    title: 'La ruta de la cumbia digital',
  },
  {
    body: [
      'Valparaíso siempre tuvo punk, pero lo que está pasando ahora tiene más que ver con la autogestión que con el sonido.',
      'Sellos, salas y estudios funcionando en red, sin intermediarios.',
    ],
    excerpt: 'Sellos, salas y estudios funcionando en red, sin intermediarios.',
    slug: 'que-esta-pasando-en-valparaiso',
    title: 'Qué está pasando en Valparaíso',
  },
  {
    body: [
      'No tienen oficinas ni catálogos enormes, pero publican con una coherencia que muchas discográficas grandes perdieron.',
      'Cinco sellos que vale la pena seguir de cerca este año.',
    ],
    excerpt: 'Cinco catálogos pequeños con más coherencia que muchas discográficas grandes.',
    slug: 'cinco-sellos-independientes',
    title: 'Cinco sellos independientes que deberías seguir',
  },
  {
    body: [
      'El casete volvió, y no por nostalgia: es el formato físico más barato de producir en tiradas cortas.',
      'Para una banda que edita doscientas copias, la cuenta sale.',
    ],
    excerpt: 'No es nostalgia: es el formato físico más barato en tiradas cortas.',
    slug: 'el-regreso-del-casete',
    title: 'El regreso del casete',
  },
  {
    body: [
      'A más de tres mil metros, la grabación de campo tiene otras reglas: el aire, el viento y el silencio pesan distinto.',
      'Un recorrido por la música que se está haciendo en el altiplano.',
    ],
    excerpt: 'Grabar a tres mil metros tiene otras reglas: el aire y el silencio pesan distinto.',
    slug: 'escenas-del-altiplano',
    title: 'Escenas del altiplano',
  },
]
