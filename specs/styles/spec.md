#### Objetivo

- Todo componente renderizado dentro del admin de Payload debe verse como una extensión nativa de Payload, no como una UI paralela.
- La consistencia visual tiene prioridad sobre cualquier preferencia local de diseño.
- Todo componente visible para usuarios finales debe sentirse parte del sistema visual actual de Oddsound y no introducir un sublenguaje de UI.

#### Reglas obligatorias

- Reutilizar primero el comportamiento visual base de Payload: tipografía, inputs, botones, links, espaciados, estados y colores por defecto.
- No introducir estilos nuevos si el componente puede resolverse con el HTML base y los estilos globales que ya carga Payload.
- Los estilos locales solo pueden usarse para layout minimo: separación vertical, alineación, orden visual y divisores simples.
- No agregar `border-radius`, `box-shadow`, fondos tipo tarjeta, pills, badges, contenedores decorativos, gradientes ni superficies nuevas.
- No agregar bordes completos alrededor de módulos, formularios, métricas, acciones o bloques informativos. Si hace falta separar contenido, usar únicamente divisores sutiles entre items.
- No cambiar tipografía, pesos, tamaños ni letter-spacing fuera de lo que ya define Payload, salvo que el propio componente nativo de Payload ya lo haga.
- No crear variantes de botones personalizadas. Si se necesita una acción, usar componentes oficiales de Payload o links de texto simples.
- No crear iconografía nueva para módulos del admin. Si Payload no provee un icono oficial para esa acción o red social, no se implementa icono.
- No usar librerías de iconos externas para interfaces dentro del admin de Payload.
- No duplicar estilos entre archivos globales y estilos por componente para resolver el mismo módulo.

#### Reglas obligatorias para frontend público

- Cualquier módulo nuevo debe heredar la tipografía, escala, color y ritmo visual ya visibles en Oddsound.
- `Release` y `Shop` se consideran desde ahora entidades visuales de referencia obligatoria para cualquier módulo nuevo vinculado a lanzamientos, comentarios, compra, tracking, cuenta de fan o navegación derivada.
- Ningún módulo nuevo relacionado con consumo musical, commerce, comentarios o cuenta de usuario puede introducir un lenguaje visual distinto al ya visible en las interfaces públicas de `Release` y `Shop`.
- Las interfaces actuales de `Release` y `Shop` no son inspiración opcional. Son patrón obligatorio de implementación y de cumplimiento estricto.
- Si una propuesta de UI no puede explicarse como extensión directa de `Release` o `Shop`, esa propuesta debe rechazarse y rediseñarse.
- Priorizar links de texto, títulos, párrafos, listas, divisores y espaciado existente antes que construir botones, cards, chips o popups decorativos nuevos.
- Modales, popups, drawers o overlays deben ser sobrios: fondo del sistema, contraste existente, sin sombras pesadas, sin gradientes y sin ornamentos nuevos.
- Las acciones de compartir, copiar, cerrar, navegar o confirmar deben verse como extensiones del patrón editorial actual, no como widgets de red social embebidos.
- No usar iconografía externa para redes sociales o acciones si no existe un patrón visual oficial ya adoptado por Oddsound. En ese caso, resolver con texto.
- No mezclar estilos inline con estilos de sistema para resolver un mismo componente visible al usuario final.
- No introducir colores de marca de terceros dentro de módulos editoriales o de sharing si eso rompe la paleta neutral del producto.
- En módulos de sharing editorial, el texto descriptivo principal debe salir del contenido real del artículo por defecto; no usar copys genéricos si ya existe un extracto válido.
- Si el modal ya tiene una acción clara de cierre en el encabezado, no duplicarla en el footer.
- No repetir en el footer acciones secundarias de copiar enlace si ya existen dentro del flujo principal de opciones.
- Los títulos de sección dentro de modales o popups deben conservar una separación vertical consistente con la relación título-opciones ya usada por el frontend de Oddsound.
- En artículos de `posts`, el cuerpo editorial debe usar una tipografía serif con carácter de lectura larga, similar a `Times New Roman`.
- En el modal de compartir de `posts`, el extracto editorial debe usar esa misma familia serif del artículo.
- El resumen visible del modal de compartir debe extraerse del contenido real del texto enriquecido y resolver hasta tres líneas útiles cuando el contenido exista.

#### Estructura estricta para módulos públicos

- Trigger: acción breve, textual y consistente con el contexto donde vive el módulo.
- Contenedor: superficie neutra del sistema o layout simple, sin decoración adicional.
- Encabezado: título corto y, si hace falta, una sola línea descriptiva.
- Cuerpo: contenido útil, escaneable y con separación clara.
- Acciones: lista o grupo de acciones con una jerarquía textual consistente.
- Estados: copiado, deshabilitado, error o vacío resueltos con texto breve y el mismo lenguaje visual del resto de la plataforma.
- Footer: solo debe existir si aporta una acción distinta y necesaria; si duplica acciones del header o del cuerpo, se elimina.
- Resumen editorial: en `posts`, debe salir del contenido del artículo y no puede omitirse si existe texto legible en el rich text.

#### Referencias visuales obligatorias

- Para módulos de lanzamientos, comentarios, actividad sobre música, feedback al artista o consumo editorial, la referencia obligatoria es la interfaz pública de `Release`.
- Para módulos de compra, historial de compras, estado de pedido, catálogo, checkout relacionado y tracking de fan, la referencia obligatoria es la interfaz pública de `Shop`.
- Para módulos híbridos de cuenta de fan, deben convivir ambos patrones sin introducir un tercer lenguaje visual.
- No se autoriza reinterpretar `Release` y `Shop` con nuevas superficies, nuevas densidades visuales o nuevas jerarquías de acción.
- Si existe duda entre varias soluciones, debe elegirse la que más se parezca al comportamiento visual ya presente en `Release` y `Shop`.

#### Regla de cumplimiento obligatorio

- Toda nueva interfaz pública debe declarar explícitamente si hereda de `Release`, de `Shop` o de ambas.
- Ningún cambio de UI de módulos públicos debe avanzar a implementación si no identifica su referencia obligatoria.
- `Release` y `Shop` deben permanecer como referencias estables del spec salvo instrucción expresa y documentada para rediseñarlas de forma global.
- No se permiten desviaciones estilísticas locales, experimentales o improvisadas en módulos nuevos.
- Este criterio aplica a comentarios, cuenta del fan, compras, tracking, estados de pedido, historial, autenticación de fan y cualquier extensión futura derivada.

#### Reglas obligatorias de seguridad para fan

- La cuenta `fan` no puede acceder al admin de Payload ni al dashboard interno.
- La cuenta `fan` no puede ver ni crear lanzamientos, biografías, perfiles musicales, imágenes, productos, publicaciones programadas ni cualquier otro módulo editorial o de commerce interno.
- La cuenta `fan` no puede crear ni gestionar carritos dentro del admin o del plugin ecommerce.
- La cuenta `fan` solo puede interactuar con sus comentarios, su historial de compra y su tracking dentro del frontend autenticado de Oddsound.
- Las restricciones para `fan` deben implementarse con access control real, no solo con ocultamiento visual o CSS.
- Toda nueva extensión del módulo `fan` debe validar explícitamente que no reabra acceso a colecciones, rutas o acciones reservadas a admin, artista, banda o redacción.

#### Estructura estricta para módulos de admin

- Encabezado funcional con título y contexto corto.
- Cuerpo basado en listas, filas, campos y acciones oficiales de Payload.
- Separación mediante flujo vertical y divisores sutiles.
- Sin wrappers decorativos si el contenido ya se entiende por sí mismo.

#### Criterio para módulos actuales y futuros

- Cualquier módulo nuevo de admin debe funcionar correctamente aun si se eliminan sus estilos decorativos.
- Cualquier módulo nuevo del frontend debe seguir siendo coherente si se reduce a tipografía, espaciado, links y colores de sistema.
- Cualquier módulo nuevo asociado a consumo, feedback o commerce debe seguir siendo coherente si se compara directamente con `Release` y `Shop`.
- Antes de agregar CSS, comprobar si el componente sigue siendo claro usando solo markup semántico, clases mínimas de layout y componentes oficiales de Payload.
- Si un módulo necesita una sección, debe resolverse como flujo de contenido con títulos, texto, listas, inputs y acciones nativas; no como tarjeta o bloque visual independiente.
- Si una integración visual no puede hacerse con el lenguaje oficial de Payload, se simplifica el módulo en vez de diseñar una alternativa custom.
- Si una integración social o promocional exige UI de marca ajena al sistema, se reduce a una acción textual o a copiar enlace.

#### Plan de implementación y mantenimiento

- Revisar cada módulo custom del admin y eliminar radios, sombras, tarjetas, fondos y bordes envolventes existentes.
- Consolidar los estilos de soporte en una sola capa mínima, evitando duplicados entre `custom.scss` y hojas por componente.
- Mantener los formularios custom apoyados en los estilos globales de Payload para inputs, labels y botones.
- Representar métricas, estados y accesos rápidos como listas o filas de contenido, no como cards ni chips.
- Revisar componentes públicos con overlays, share actions, popups o CTAs que hoy impongan un lenguaje visual ajeno al resto de Oddsound.
- Resolver sharing, copiado y estados de interacción con texto y jerarquía editorial antes de considerar iconos o superficies nuevas.
- Validar cada módulo nuevo contra este spec antes de mergear cambios de UI en Payload admin.
