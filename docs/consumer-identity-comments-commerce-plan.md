# Oddsound Consumer Identity, Comments and Commerce Plan

## Objetivo

Definir una arquitectura funcional y técnica para que una misma cuenta de consumidor, asociada a Google, permita:

- comentar lanzamientos de álbumes y singles
- comprar productos musicales y merchandising
- consultar el historial de compras y su tracking
- mantener trazabilidad entre consumidor, lanzamiento, artista y compra

La meta no es crear un flujo separado para comentarios y otro para compras. La meta es una sola identidad de consumidor dentro de Oddsound.

## Principio obligatorio de interfaz

Este módulo no puede introducir una UI nueva.

Toda implementación futura debe respetar el sistema visual ya existente en Oddsound y las reglas de [specs/styles/spec.md](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/specs/styles/spec.md:1).

### Reglas operativas de UI para este proyecto

- Todo flujo nuevo de consumidor debe reutilizar la tipografía, espaciado, tono visual y jerarquía actual del frontend público.
- Todo flujo nuevo de backoffice o dashboard debe verse como una extensión del admin y dashboard actual, no como un subproducto nuevo.
- No se deben introducir cards decorativas, badges, gradientes, overlays o contenedores visuales nuevos si el flujo puede resolverse con markup, layout y estilos ya presentes.
- Los nuevos módulos deben tomar como referencia directa las pantallas actuales de release público y shop público.
- El acceso a registro y login de `consumer` debe seguir el mismo criterio sobrio del flujo actual de creador: enlaces de texto simples, sin dropdowns ni selectores mezclados dentro del formulario de artista o banda.
- Antes de diseñar un componente nuevo, la pregunta debe ser: "¿en qué pantalla existente de Oddsound cabe este patrón sin cambiar el lenguaje visual?"

## Contexto actual del proyecto

La base actual ya cubre parte importante del problema:

- `users` está orientado hoy a creadores y admins: [src/collections/Users/index.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Users/index.ts:1)
- `profiles` modela perfiles de artista, banda y editorial: [src/collections/Profiles/index.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Profiles/index.ts:1)
- `pages` representa los lanzamientos públicos: [src/collections/Pages/index.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Pages/index.ts:1)
- el release público ya existe como patrón visual de referencia: [src/app/(frontend)/[slug]/release/[releaseSlug]/page.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/[slug]/release/[releaseSlug]/page.tsx:1)
- el shop público ya existe y debe ser referencia para cualquier vista de compras del consumidor: [src/app/(frontend)/[slug]/shop/page.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/[slug]/shop/page.tsx:1)
- ya existe una base de órdenes, transacciones y datos extendidos para Mercado Pago: [src/collections/Commerce/officialCheckout.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Commerce/officialCheckout.ts:1)

Conclusión: no hace falta inventar una nueva arquitectura visual. Hace falta extender la identidad y los datos.

## Problema de producto a resolver

Hoy el flujo implícito es fragmentado:

- el visitante puede interesarse por un lanzamiento
- puede querer comentar
- puede querer comprar
- puede querer ver luego qué compró o qué comentó

Pero el proyecto todavía no tiene una identidad persistente de consumidor que una esas acciones.

Eso genera fricción y también pérdida de valor para la plataforma:

- comentar como invitado obliga a pedir datos repetidos
- comprar por un proveedor externo no crea relación fuerte con Oddsound
- el artista no obtiene una vista unificada de audiencia y compradores
- el consumidor no obtiene una cuenta útil dentro del producto

## Propuesta de producto

Crear una identidad única de consumidor dentro de Oddsound, con inicio de sesión rápido mediante Google, para centralizar:

- comentarios
- historial de compras
- estado de pedidos
- relación con artistas y lanzamientos

Mercado Pago debe seguir siendo proveedor de pagos. No debe convertirse en el sistema de identidad del consumidor.

## Nota de coordinación de ramas

La vinculación técnica de Mercado Pago no se implementará dentro de esta línea de trabajo.

Reglas:

- la integración de Mercado Pago avanza en una rama separada
- este plan debe dejar definidos el modelo, el tracking, las dependencias y los puntos de integración
- el wiring final de pagos se completará después mediante merge entre ramas
- el módulo de consumidor no debe quedar bloqueado esperando la implementación completa de esa rama

## Alcance MVP

El MVP debe resolver solo lo esencial:

- login con Google para consumidores
- entrada visible desde autenticación con enlace textual separado para `consumer`
- creación automática de cuenta interna de consumidor
- comentarios autenticados en releases
- asociación de comentarios a consumidor, release y artista
- asociación de compras a la misma identidad de consumidor
- página básica de cuenta con:
  - comentarios realizados
  - compras realizadas
  - estado de pedidos
- moderación básica de comentarios

## Fuera de alcance para el MVP

- red social completa entre consumidores y artistas
- likes, replies, menciones o follows
- reputación pública compleja
- feed de actividad
- wallet, puntos o rewards
- recomendación avanzada basada en comportamiento
- soporte multi-provider de login social desde el primer release
- mezcla de `consumer` dentro del mismo formulario de registro de artista o banda

## Decisiones de arquitectura recomendadas

### 1. Mantener `users` como identidad base

La colección `users` debe seguir siendo la base de autenticación. Es preferible extender el modelo actual antes que abrir una colección auth paralela.

Ventajas:

- una sola fuente de identidad
- menos complejidad de auth
- mejor relación con órdenes, comentarios y permisos

### 2. Separar consumidor de artista a nivel de negocio

No conviene mezclar consumidor con `profiles`.

`profiles` ya está claramente orientado a identidad pública creativa. Reutilizarlo para fans o compradores degradaría:

- reglas de acceso
- consistencia del admin
- claridad del modelo
- flujos del frontend

### 3. Crear un perfil liviano de consumidor

Se recomienda una colección nueva, por ejemplo `consumerProfiles` o `customerProfiles`, para guardar identidad funcional del comprador/comentarista.

### 4. Crear comentarios como colección independiente

Los comentarios no deben vivir embebidos dentro de `pages` si se quiere:

- moderación
- búsqueda
- paginación
- auditoría
- relación con compras o verificación de comprador

### 5. Asociar órdenes a la identidad autenticada de Oddsound

Las órdenes deben guardar relación con el consumidor autenticado, además de las referencias de Mercado Pago.

### 6. Mantener una sola base de datos en esta etapa

No conviene abrir ahora una base de datos separada para consumidores.

Recomendación:

- mantener una sola base Mongo/Payload
- separar `profiles` y `consumerProfiles`
- usar `users` como auth común
- escalar primero con índices, consultas pequeñas, caché y desacople de tareas

Solo tendría sentido separar infraestructura después si aparecen métricas reales de:

- volumen desbalanceado muy alto entre consumidores y creadores
- cuellos de botella persistentes en la base compartida
- necesidad operativa de aislamiento fuerte

## Modelo de datos propuesto

### Estrategia de almacenamiento

La separación recomendada es:

- misma base de datos
- colecciones separadas por dominio
- relaciones claras entre identidad, comentarios y comercio

No se recomienda, en esta etapa, una base independiente para consumidor.

### Extensión sugerida de `users`

Opciones posibles:

- ampliar `role`
- añadir un `userType`
- añadir una segmentación adicional para consumidores

Recomendación:

- no forzar `role` con demasiada semántica mezclada
- introducir una dimensión clara tipo `userType`

Ejemplo conceptual:

- `admin`
- `creator`
- `consumer`

Campos útiles futuros:

- `authProvider`
- `googleSubjectId`
- `avatar`
- `lastLoginAt`
- `consumerProfile`

### Nueva colección `consumerProfiles`

Campos sugeridos:

- `owner` -> relación con `users`
- `displayName`
- `email`
- `avatar`
- `status`
- `preferences`
- `defaultShippingData`
- `lastPurchaseAt`
- `lastCommentAt`
- `stats`

Objetivo:

- separar auth de datos funcionales del consumidor
- permitir crecimiento futuro sin contaminar `users`

### Nueva colección `comments`

Campos sugeridos:

- `authorUser`
- `consumerProfile`
- `release` -> relación con `pages`
- `artistProfile` -> relación con `profiles`
- `content`
- `status` -> `pending`, `approved`, `rejected`
- `purchaseVerified`
- `source` -> `release-public`
- `createdAt`
- `updatedAt`
- `moderatedAt`
- `moderatedBy`

Índices recomendados:

- `release + status + createdAt`
- `artistProfile + status + createdAt`
- `consumerProfile + createdAt`
- `authorUser + createdAt`

### Extensión de órdenes / checkout

Las órdenes y transacciones actuales deberían poder guardar:

- `user`
- `consumerProfile`
- `artistProfile`
- `release` cuando aplique
- `items`
- `paymentProvider`
- `paymentProviderOrderId`
- `paymentProviderPaymentId`
- `fulfillmentStatus`
- `trackingNumber`
- `carrierName`

Esto no reemplaza lo que ya existe. Lo completa.

Nota de coordinación:

- si algunos campos o estados dependen de la rama separada de Mercado Pago, deben quedar definidos desde ahora en el spec y en la cuenta del consumidor aunque su conexión final se haga después del merge

## Flujos de usuario propuestos

### Flujo 0. Entrada a registro y login

1. El usuario llega al acceso de autenticación.
2. Ve dos enlaces textuales separados:
   - regístrate como artista o banda
   - regístrate como consumer
3. Cada enlace lleva a un flujo propio.
4. No existe dropdown ni selector dentro del formulario de artista o banda para convertirse en consumer.
5. El formulario de consumer vive como flujo aparte y se resuelve con vínculo de Google.

### Flujo 1. Comentar un lanzamiento

1. El visitante entra a un release.
2. Ve el bloque de comentarios usando el lenguaje visual actual del release público.
3. Si no ha iniciado sesión, el CTA principal debe ser textual y directo: iniciar sesión con Google para comentar.
4. Tras autenticarse, se crea o reutiliza su `user` y su `consumerProfile`.
5. Envía el comentario.
6. El comentario queda asociado a:
   - usuario
   - consumer profile
   - release
   - artista
7. El comentario queda en `pending` o `approved` según política de moderación.

### Flujo 2. Comprar producto o merchandising

1. El consumidor entra al shop público existente.
2. Selecciona un producto.
3. Antes de iniciar checkout, el sistema puede pedir login si aún no existe identidad local.
4. La orden local se crea vinculada al `user` y al `consumerProfile`.
5. Mercado Pago procesa el pago.
6. Oddsound conserva el historial y estado de la compra en la cuenta del consumidor.

Nota de alcance:

- este flujo queda definido funcionalmente ahora, pero la vinculación técnica con Mercado Pago se consolidará cuando se integre la rama separada de pagos

### Flujo 3. Ver historial

1. El consumidor entra a “Mi cuenta”.
2. Ve una navegación simple, consistente con Oddsound, sin diseño nuevo.
3. Revisa:
   - comentarios hechos
   - compras realizadas
   - estado y tracking de pedidos

### Flujo 4. Vista para artista o admin

1. El artista o admin accede a una vista de comentarios recibidos.
2. Puede ver:
   - release comentado
   - consumidor
   - contenido
   - estado
   - marca de comprador verificado si existe
3. Puede aprobar, rechazar o revisar comentarios según reglas.

## Reglas de negocio recomendadas

### Comentarios

- Para MVP, comentar debe requerir autenticación.
- No recomendar comentarios anónimos en la primera versión.
- El comentario debe asociarse siempre a un release publicado.
- El artista no debe editar el contenido del comentario; solo moderarlo si la política lo permite.

### Compras

- La compra debe asociarse al usuario aunque el pago suceda en Mercado Pago.
- Si un usuario compra sin sesión activa, debe definirse si:
  - se obliga login antes del checkout
  - o se reconcilia la compra después por email

Recomendación MVP:

- exigir login antes del checkout del consumidor cuando se quiera historial consistente

### Comprador verificado

- No debe depender de un campo manual.
- Debe derivarse de una orden válida vinculada al mismo usuario o email.

## Reglas de moderación recomendadas

MVP:

- comentario autenticado
- estado inicial `pending`
- aprobación por admin y, si se define, por artista propietario del release

Fase posterior:

- autoaprobación para usuarios confiables
- rate limiting
- antiflood
- filtros básicos anti-spam
- bloqueo o suspensión de consumidores abusivos

## Reglas de interfaz obligatorias para este módulo

### Frontend público

- El bloque de comentarios debe insertarse como una extensión natural del release público actual.
- Debe usar la misma lógica de composición editorial: título, texto, links, separación vertical y tono sobrio.
- No debe aparecer como “widget social” externo.
- El acceso a login con Google debe resolverse con acción textual y jerarquía visual coherente con Oddsound.
- El acceso a registro de consumer debe aparecer como enlace de texto simple, paralelo al flujo actual de artista o banda.
- El formulario de artista o banda no debe renderizar controles para elegir `consumer`.
- El formulario de `consumer` debe ser independiente del formulario musical.
- La cuenta del consumidor debe tomar como referencia la sobriedad del shell y páginas públicas actuales.
- La vista de compras debe heredar patrones ya visibles en el shop y no crear una tienda paralela.

### Dashboard / admin

- Si se expone gestión de consumidores o comentarios dentro del admin, debe verse como extensión del admin de Payload.
- Si se expone una cuenta de consumidor en frontend autenticado, debe reutilizar la estructura del dashboard o shell existente antes de crear uno nuevo.
- Ningún módulo nuevo puede entrar con tipografía, CTAs, superficies o iconografía nuevas.

### Regla de validación previa a diseño

Antes de implementar cualquier pantalla nueva se debe responder:

1. Qué pantalla actual de Oddsound se toma como referencia principal.
2. Qué componentes existentes se reutilizan.
3. Qué parte exacta del `specs/styles/spec.md` limita la solución.
4. Qué elementos visuales nuevos se están evitando deliberadamente.

Sin esa validación, el diseño no debería avanzar.

## Riesgos principales

### 1. Mezclar consumidor con perfil de artista

Riesgo:

- romper claridad del modelo y del admin

Mitigación:

- colección separada para consumidor

### 2. Hacer login social sin estrategia clara de identidad

Riesgo:

- cuentas duplicadas
- mala reconciliación entre comentario y compra

Mitigación:

- definir llave primaria por email y proveedor
- crear flujo de vinculación o reutilización de cuenta

### 3. Permitir checkout sin identidad local

Riesgo:

- compras sin historial consistente
- imposibilidad de “comprador verificado”

Mitigación:

- pedir login antes del checkout del MVP

### 4. Abrir comentarios sin moderación

Riesgo:

- spam
- abuso
- carga operativa alta para artistas

Mitigación:

- `pending` por defecto y reglas mínimas desde el inicio

### 5. Desviarse del sistema visual actual

Riesgo:

- inconsistencia en frontend y dashboard
- deuda de interfaz
- sensación de producto fragmentado

Mitigación:

- tratar el `spec` de estilos como restricción de arquitectura, no como sugerencia
- exigir referencia visual explícita antes de cada pantalla nueva

## Fases de implementación sugeridas

### Fase 0. Definición

- cerrar el modelo de identidad de consumidor
- decidir el alcance exacto del login con Google
- definir si el checkout exigirá login desde el MVP
- definir política de moderación inicial

### Fase 1. Identidad

- extender `users`
- crear `consumerProfiles`
- definir flujo de autenticación con Google
- asegurar creación y reutilización correcta de cuentas

### Fase 2. Comentarios

- crear colección `comments`
- exponer comentarios en releases
- crear publicación autenticada
- aplicar moderación básica

### Fase 3. Comercio conectado a identidad

- enlazar órdenes y transacciones existentes al consumidor autenticado
- registrar estado de compra y tracking en la cuenta
- preparar la base de “comprador verificado”

### Fase 4. Cuenta del consumidor

- crear una vista simple de “Mi cuenta”
- mostrar comentarios
- mostrar compras
- mostrar tracking y estados

### Fase 5. Operación y seguridad

- antiflood
- rate limiting
- observabilidad
- mejoras de moderación

## Decisiones que deben cerrarse antes de abrir rama

1. Si `consumer` será `role`, `userType` o una combinación controlada.
2. Nombre final de la colección de perfil de consumidor.
3. Si comentar requerirá login obligatorio sin excepción.
4. Si comprar requerirá login antes del checkout en el MVP.
5. Si el artista podrá moderar directamente o solo admin.
6. Si se mostrará desde el inicio la marca de “comprador verificado”.
7. Cuál será la referencia exacta de UI para:
   - comentarios en release
   - cuenta del consumidor
   - historial de compras

## Recomendación final

La solución más limpia para Oddsound es:

- una sola identidad base en `users`
- un tipo de usuario consumidor claramente separado del creador
- una colección propia de perfil de consumidor
- comentarios autenticados como colección separada
- órdenes de Mercado Pago vinculadas a la identidad interna
- una cuenta de consumidor mínima pero útil
- disciplina estricta de interfaz basada en el sistema ya existente

Esto permite crecer hacia funciones sociales y de fidelización sin reescribir la base de identidad ni romper la consistencia del producto.
