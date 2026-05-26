# Oddsound Architecture V1

Este documento propone una nueva arquitectura para Oddsound pensada para:

- preservar casi toda la experiencia actual de UI y estilo
- reemplazar la arquitectura monolítica acoplada a Payload para el tráfico principal
- escalar mejor lectura pública, búsqueda y actividad de creadores
- migrar sin perder los datos que entren mientras la transición ocurre

## Objetivo de producto

Oddsound no debe modelarse como un simple CMS con páginas públicas. La dirección correcta es una plataforma social y editorial para músicos y sellos con:

- perfiles de creadores
- releases publicados
- descubrimiento por género, país y artista
- futuras interacciones sociales
- panel creator
- operación pública con alto volumen de lectura

## Lo que se preserva

La UI actual sí es reutilizable en gran parte. La estrategia recomendada es mantener la experiencia visual mientras cambiamos el backend.

### Páginas y flujos reutilizables

- home pública: [src/app/(frontend)/page.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/page.tsx:9)
- discover: [src/app/(frontend)/search/page.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/search/page.tsx:121)
- release pública: [src/app/(frontend)/[slug]/page.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/[slug]/page.tsx:52)
- releases por artista: [src/app/(frontend)/[slug]/releases/page.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/[slug]/releases/page.tsx:56)
- login creator: [src/app/(frontend)/creator/login/view.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/creator/login/view.tsx:1)
- registro creator: [src/app/(frontend)/creator/register/view.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/creator/register/view.tsx:1)
- dashboard creator inicial: [src/app/(frontend)/creator/dashboard/page.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/creator/dashboard/page.tsx:1)

### Componentes visuales reutilizables

- cards y media: `src/components/Card`, `src/components/Media`
- héroes y bloques: `src/heros`, `src/blocks`
- shell auth creator: `src/app/(frontend)/creator/auth-shell.tsx`
- UI base: `src/components/ui`
- estilos globales: [src/app/(frontend)/globals.css](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/globals.css:1)

### Qué cambia por debajo

- la fuente de datos deja de ser `getPayload()` en páginas públicas
- auth creator deja de depender del auth de Payload
- discover deja de filtrar en memoria del servidor
- uploads pasan a almacenamiento dedicado con procesamiento asíncrono
- las páginas públicas se sirven desde caché/ISR/CDN

## Problemas actuales que motivan la migración

### Acoplamiento monolítico

Frontend público, admin, auth, jobs y API comparten el mismo runtime: [src/payload.config.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/payload.config.ts:30).

### Discover no escalable

Discover carga `pages` y `profiles` y filtra en memoria: [src/app/(frontend)/search/page.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/search/page.tsx:127).

### Home con consultas vivas

La home y la sección de releases hacen consultas directas en render: [src/app/(frontend)/page.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/page.tsx:12), [src/app/(frontend)/home-components/ReleasesHomeSection.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/home-components/ReleasesHomeSection.tsx:12).

### Coste extra de escritura editorial

Antes de guardar, el sistema resuelve ownership y slug con lecturas adicionales: [src/hooks/assignOwnership.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/hooks/assignOwnership.ts:4), [src/hooks/generateCreatorContentSlug.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/hooks/generateCreatorContentSlug.ts:86).

### Autosave demasiado agresivo

Los drafts de posts tienen autosave de `100 ms`: [src/collections/Posts/index.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Posts/index.ts:302). Ese valor no es compatible con crecimiento editorial fuerte.

## Arquitectura objetivo

La propuesta base es `modular monolith + servicios externos`, preparada para extraer módulos más adelante sin rehacer el sistema completo.

### Frontend

- `Next.js` como web pública y panel creator
- `App Router`
- componentes actuales reutilizados
- capa `lib/api` o `services` para desacoplar UI del backend
- páginas públicas con `ISR`, cache tags y CDN

### Backend principal

Node.js + TypeScript en un backend propio, organizado por módulos:

- `auth`
- `users`
- `profiles`
- `releases`
- `media`
- `discover`
- `social`
- `notifications`
- `admin`
- `analytics`

Cada módulo debe tener:

- schema
- service
- repository
- validator
- DTOs
- jobs asociados

### Infraestructura

- `MongoDB` como source of truth
- `Redis` para cache, rate limiting y colas
- `BullMQ` para jobs asíncronos
- `Meilisearch` o `OpenSearch` para Discover
- `S3/R2/Cloudflare` para media
- `CDN` para público y assets
- observabilidad con logs, métricas y tracing

## Diagrama lógico

```text
Next.js Web
  -> BFF/API Gateway
    -> Auth Module
    -> Profiles Module
    -> Releases Module
    -> Media Module
    -> Discover Module
    -> Social Module
    -> Notifications Module

Releases/Profile writes
  -> MongoDB
  -> domain events
  -> BullMQ workers
    -> Search indexing
    -> Media processing
    -> Email notifications
    -> Cache invalidation

Public read paths
  -> CDN / ISR cache
  -> Search engine for discover
  -> Mongo only when needed
```

## Modelo de datos propuesto

### users

- `_id`
- `email`
- `passwordHash`
- `status`
- `role`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

Índices:

- unique `email`
- `role`
- `status`

### profiles

- `_id`
- `userId`
- `slug`
- `displayName`
- `accountType`
- `bio`
- `genrePrimary`
- `genreSecondary[]`
- `country`
- `city`
- `avatar`
- `coverImage`
- `socialLinks[]`
- `stats`
- `visibility`
- `createdAt`
- `updatedAt`

Índices:

- unique `slug`
- unique `userId`
- `country`
- `genrePrimary`
- `visibility`

### releases

- `_id`
- `creatorId`
- `profileId`
- `slug`
- `title`
- `description`
- `coverImage`
- `heroVariant`
- `genre`
- `country`
- `releaseDate`
- `publishedAt`
- `status`
- `visibility`
- `mediaAssets[]`
- `content`
- `stats`
- `createdAt`
- `updatedAt`

Índices:

- unique `slug`
- `profileId + status + publishedAt`
- `creatorId + status + publishedAt`
- `genre + publishedAt`
- `country + publishedAt`

### media_assets

- `_id`
- `ownerId`
- `profileId`
- `storageKey`
- `mimeType`
- `kind`
- `width`
- `height`
- `duration`
- `status`
- `variants`
- `createdAt`

Índices:

- `ownerId`
- `profileId`
- `status`

### follows

- `_id`
- `followerUserId`
- `targetProfileId`
- `createdAt`

Índice:

- unique `followerUserId + targetProfileId`

### search_documents

Documento denormalizado para Discover:

- `entityType`
- `entityId`
- `releaseSlug`
- `releaseTitle`
- `creatorSlug`
- `creatorName`
- `genre`
- `country`
- `imageUrl`
- `publishedAt`
- `searchText`
- `visibility`

## Contratos API iniciales

### Auth

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `POST /v1/auth/forgot-password`
- `POST /v1/auth/reset-password`
- `POST /v1/auth/verify-email`
- `GET /v1/auth/me`

### Profiles

- `GET /v1/profiles/:slug`
- `PATCH /v1/profiles/me`
- `GET /v1/profiles/me`
- `GET /v1/profiles/:slug/releases`

### Releases

- `GET /v1/releases/:slug`
- `POST /v1/releases`
- `PATCH /v1/releases/:id`
- `POST /v1/releases/:id/publish`
- `GET /v1/releases/me`

### Discover

- `GET /v1/discover?q=&genre=&country=&page=`
- `GET /v1/home/featured`

### Media

- `POST /v1/media/upload-url`
- `POST /v1/media/complete`
- `GET /v1/media/:id`

## Estrategia de caché

### Público

- home pública cacheada
- perfil público cacheado
- release pública cacheada
- invalidación por tags cuando cambia un release publicado

### Discover

- búsqueda sale del motor de búsqueda, no de Mongo
- queries calientes pueden cachearse brevemente en Redis

### Dashboard creator

- no se cachea agresivamente
- prioriza exactitud de escritura

## Estrategia de migración

La migración debe ser progresiva y reversible.

### Fase 1: freeze funcional

Congelar por escrito:

- rutas
- componentes
- estilos
- formularios
- copy
- comportamiento UX crítico

### Fase 2: inventario de datos actuales

Mapear desde Payload:

- `users`
- `profiles`
- `pages` como releases
- `posts` como editorial secundaria
- `media`

### Fase 3: backfill inicial

Crear scripts para:

- exportar datos desde Payload/Mongo actual
- transformar relaciones y slugs
- normalizar media URLs
- poblar Mongo nuevo
- poblar índice de Discover

### Fase 4: sync incremental

Mientras el sistema actual sigue vivo:

- los nuevos registros y cambios se replican al sistema nuevo
- la fuente temporal de verdad sigue siendo el sistema actual

Opciones:

- polling incremental por `updatedAt`
- dual write controlado
- eventos/webhooks si se introducen hooks de salida

La recomendación inicial es `polling incremental + idempotencia` para reducir riesgo.

### Fase 5: cutover por capas

Orden sugerido:

1. páginas públicas
2. Discover
3. auth creator
4. dashboard creator
5. admin interno

### Fase 6: read-only y apagado

- sistema anterior queda read-only unos días
- validar integridad
- apagar escritura antigua

## Roadmap sugerido

### Sprint 1

- crear documento de inventario UI
- diseñar modelo de datos nuevo
- definir contratos API
- definir infraestructura local con Docker

### Sprint 2

- bootstrap backend modular
- auth básico
- profiles
- releases draft
- upload signed URLs

### Sprint 3

- build de home pública contra backend nuevo
- build de release pública
- build de perfil público
- integración de caché

### Sprint 4

- Discover con motor de búsqueda
- jobs de indexación
- migración inicial de datos
- smoke tests de consistencia

### Sprint 5

- login/register/reset creator contra backend nuevo
- dashboard creator nuevo
- publicación de releases
- invalidación de cache

### Sprint 6

- sync incremental
- cutover parcial
- observabilidad y load tests

## Capacidad objetivo inicial

Con esta arquitectura bien desplegada, la meta razonable es:

- `5.000` lectores concurrentes en home y páginas públicas
- `miles` de búsquedas concurrentes si Discover usa search engine
- `100-250` creadores editando activamente como primera meta sólida
- `300+` creadores editando con tuning posterior

La meta de `5.000` creadores editando al mismo tiempo no debe ser el objetivo de la primera versión operativa. Se diseña para crecer hacia allá, pero no se promete en el primer corte.

## Open source que vale evaluar

### Referencia de arquitectura modular

- Medusa
  - https://github.com/medusajs/medusa
  - útil como inspiración de módulos, workflows y separación de infraestructura

### Referencia de red social

- Ocelot Social
  - https://github.com/Ocelot-Social-Community/Ocelot-Social
  - útil como referencia de dominios sociales y operación de plataforma

### Referencia social framework

- Replyke
  - https://github.com/replyke/monorepo
  - útil para acelerar funciones sociales

### Referencia de dominio musical

- MusicShare
  - https://github.com/yss14/musicshare
  - útil para ideas de gestión de música y sharing

### Referencia de producto tipo Instagram

- Pixelfed
  - https://github.com/pixelfed/pixelfed
  - útil como referencia de UX/features, no como base directa en este stack

### Infraestructura recomendada

- BullMQ
  - https://docs.bullmq.io/guide/queues
- Meilisearch
  - https://www.meilisearch.com/docs/capabilities/multi_search/getting_started/federated_search

## Decisiones recomendadas

- conservar frontend visual casi intacto
- desacoplar UI de Payload primero
- no rehacer diseño y backend al mismo tiempo
- mover Discover fuera de queries directas a Mongo
- mover media a almacenamiento dedicado
- introducir eventos y workers desde el inicio
- migrar por capas, nunca con apagón total

## Siguiente documento recomendado

Después de este archivo, el siguiente entregable debe ser:

- `docs/oddsound-ui-audit.md`

Ese documento debería listar, pantalla por pantalla, qué componente se porta tal cual, qué se adapta y qué se reemplaza.
