export type ReleaseFixture = {
  description: string
  slug: string
  spotify: string
  title: string
}

export type ArtistFixture = {
  accountType: 'artist' | 'band'
  bio: string
  country: string
  displayName: string
  genre: string
  releases: ReleaseFixture[]
  slug: string
}

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildReleases(
  artistSlug: string,
  entries: [title: string, spotifyID: string, description: string][],
): ReleaseFixture[] {
  return entries.map(([title, spotifyID, description]) => ({
    description,
    // Prefixed with the artist so a release slug can never collide with a
    // profile slug — both live in the same top-level `/[slug]` namespace.
    slug: `${artistSlug}-${toSlug(title)}`,
    spotify: `https://open.spotify.com/album/${spotifyID}`,
    title,
  }))
}

export const artists: ArtistFixture[] = [
  {
    accountType: 'band',
    bio: 'Cuarteto bogotano que mezcla guitarras densas con letras de barrio. Llevan una década tocando en sótanos y salas pequeñas.',
    country: 'Colombia',
    displayName: 'Los Petirrojos',
    genre: 'Rock',
    slug: 'los-petirrojos',
    releases: buildReleases('los-petirrojos', [
      [
        'Noche Larga',
        '4aawyAB9vmqN3uQ7FjRGTy',
        'Nueve canciones grabadas en dos madrugadas de diciembre.',
      ],
      [
        'Cables de Alta Tensión',
        '1DFixLWuPkv3KT3TnV35m3',
        'Un disco sobre la ciudad que no se apaga nunca.',
      ],
      [
        'Verano Prestado',
        '6trNtQUgC8cgbWcqoMYkOR',
        'EP de cuatro cortes escrito durante una gira que se cayó.',
      ],
      [
        'Mapa Roto',
        '2noRn2Aes5aoNVsU6iWThc',
        'El regreso al estudio después de tres años de silencio.',
      ],
    ]),
  },
  {
    accountType: 'band',
    bio: 'Colectivo de Veracruz que reescribe la cumbia con sintetizadores y percusión de mercado.',
    country: 'México',
    displayName: 'Sonora Azul',
    genre: 'Cumbia',
    slug: 'sonora-azul',
    releases: buildReleases('sonora-azul', [
      ['Mar Adentro', '0ETFjACtuP2ADo6LFhL6HN', 'Cumbia costeña grabada a dos cuadras del puerto.'],
      [
        'Baile del Mercado',
        '3mH6qwIy9crq0I9YQbOuDf',
        'Diez pistas pensadas para sonar en bocina de plaza.',
      ],
      ['Radio Costera', '5zi7WsKlIiUXv09tbGLKsE', 'Homenaje a las emisoras piratas del golfo.'],
      ['Luces de Neón', '7dK54iZuOxXFarGhXwEXfF', 'El lado nocturno y sintético del grupo.'],
    ]),
  },
  {
    accountType: 'artist',
    bio: 'Pianista y compositora rosarina. Trabaja el silencio como si fuera otro instrumento.',
    country: 'Argentina',
    displayName: 'Mila Ferreyra',
    genre: 'Jazz',
    slug: 'mila-ferreyra',
    releases: buildReleases('mila-ferreyra', [
      [
        'Tinta China',
        '1ATL5GLyefJaxhQzSPVrLX',
        'Piano solo, una toma por pieza, sin edición posterior.',
      ],
      [
        'Domingo Tardío',
        '0sNOF9WDwhWunNAHPD3Baj',
        'Trío grabado en vivo en una sala de ochenta butacas.',
      ],
      ['Sala Vacía', '2Tyx5dLhHYkx6zeAdVaTzN', 'Improvisaciones registradas durante la pandemia.'],
      ['Puerto Gris', '5Hd2mAJesMSluTuHXfhu6P', 'Su disco más denso, con cuerdas y electrónica.'],
    ]),
  },
  {
    accountType: 'band',
    bio: 'Punk de Valparaíso, sin concesiones. Autogestión total desde 2014.',
    country: 'Chile',
    displayName: 'Perro Muerto',
    genre: 'Punk',
    slug: 'perro-muerto',
    releases: buildReleases('perro-muerto', [
      ['Cemento Fresco', '6ZG5lRT77aJ3btmArcykra', 'Doce canciones en veintiséis minutos.'],
      ['Ruido Blanco', '3XwoIXeSuMlHOUlHNCUnLl', 'Grabado en una sola sesión de ocho horas.'],
      ['Sin Permiso', '4iw2m2ml5jH7lRSJjZgKUp', 'Split con dos bandas del puerto.'],
      ['Barricada', '2X5D8b1kJyLBLmTfbXjNsK', 'Registro en vivo de la última gira por el sur.'],
    ]),
  },
  {
    accountType: 'artist',
    bio: 'Productor madrileño de electrónica lenta. Trabaja con cintas gastadas y sintetizadores modulares.',
    country: 'España',
    displayName: 'Cassette Lunar',
    genre: 'Electrónica',
    slug: 'cassette-lunar',
    releases: buildReleases('cassette-lunar', [
      ['Órbita Baja', '1uzfGk9vxMXfaZ2avqwxod', 'Ambient construido con grabaciones de campo.'],
      ['Señal Perdida', '0M2HHtY3OOQzIZxrHkbJRS', 'Ocho piezas sobre la distancia y el ruido.'],
      ['Modo Avión', '7ycWLEP1GsNjVvcjawXz3z', 'Su trabajo más rítmico hasta la fecha.'],
      ['Frecuencia Íntima', '3IBcauSj5M2A6lTeffJzdv', 'Grabado íntegramente en una habitación.'],
    ]),
  },
  {
    accountType: 'band',
    bio: 'Indie limeño con letras domésticas y arreglos amplios.',
    country: 'Perú',
    displayName: 'Nube Rota',
    genre: 'Indie',
    slug: 'nube-rota',
    releases: buildReleases('nube-rota', [
      ['Ventana Abierta', '5MS3MvWHJ3lOZPLiMxzOU6', 'Su debut, escrito entre dos mudanzas.'],
      ['Casa de Vidrio', '2fYhqwDWXjbpjaIJPEfKFw', 'Un disco sobre vivir a la vista de todos.'],
      ['Retorno', '0YCoMHF7WKSjr2WHhqDAOh', 'EP de tres canciones y una versión.'],
      ['Insomnio Menor', '6ByJ5nGtBcpRcSJnRhoAow', 'Grabado de noche, durante seis meses.'],
    ]),
  },
  {
    accountType: 'band',
    bio: 'Rock pesado montevideano con raíz folclórica. Guitarras bajas y letras largas.',
    country: 'Uruguay',
    displayName: 'Yatra Negra',
    genre: 'Rock',
    slug: 'yatra-negra',
    releases: buildReleases('yatra-negra', [
      [
        'Piedra sobre Piedra',
        '4LH4d3cOWNNsVw41Gqt2kv',
        'Su disco más largo, con dos suites de diez minutos.',
      ],
      ['Cordillera', '1To7kWvvcqRnyv2t9EPzKr', 'Escrito durante un viaje por la ruta 5.'],
      ['Fuego Lento', '3RQQmkQEvNCY4prGKE6oc5', 'Producido por ellos mismos en una casa de campo.'],
      ['Última Curva', '5Dbax7G8SWrP9xyzkOvy2x', 'Un cierre de ciclo en siete canciones.'],
    ]),
  },
  {
    accountType: 'artist',
    bio: 'Cantautor paceño. Charango, voz y grabaciones hechas a más de tres mil metros.',
    country: 'Bolivia',
    displayName: 'Camino Alto',
    genre: 'Folk',
    slug: 'camino-alto',
    releases: buildReleases('camino-alto', [
      ['Altiplano', '2guirTSEqLizK7j9i1MTTZ', 'Canciones recogidas en comunidades del norte.'],
      ['Tejido', '0bUTHlWbkSQysoM3VsWldT', 'Colaboraciones con músicas tradicionales.'],
      ['Río Seco', '4czdORdCWP9umpbhFXK2fW', 'Un disco sobre la falta de agua.'],
      ['Semilla', '1YZ3k65Mqw3G8FzYlW1mmp', 'Su trabajo más luminoso.'],
    ]),
  },
]
