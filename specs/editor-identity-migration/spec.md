# Spec: migracion segura de identidad editorial

Fecha: 2026-08-30

## Objetivo

Reemplazar gradualmente el modelo actual basado en `editorAccess` por una identidad editorial explicita y consistente, sin romper:

- login y verificacion de correo de artistas, bandas, fans y editores
- acceso al dashboard
- permisos de `posts`, `comments`, `profiles` y `media`
- formularios del admin
- perfiles publicos editoriales ya existentes

## Problema actual

Hoy el proyecto identifica a un editor combinando varios campos:

- `role: 'creator'`
- `userType: 'creator'`
- `editorAccess: true`
- `accountType: null`
- `profile.profileType: 'editorial'`

Ese modelo funciona, pero tiene tres debilidades:

1. La identidad editorial no tiene una fuente unica de verdad.
2. El sistema mezcla permisos globales con tipo real de cuenta.
3. Un cambio pequeño en `editorAccess` puede desclasificar a un editor aunque su perfil siga siendo editorial.

## Diagnostico del codigo actual

### Users

En [src/collections/Users/index.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Users/index.ts):

- `role` solo distingue `admin` y `creator`
- `userType` distingue `creator` y `fan`
- `editorAccess` marca si una cuenta creadora es editorial
- `accountType` distingue `artist` y `band`, y se oculta si `editorAccess` es `true`

### Profiles

En [src/collections/Profiles/index.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Profiles/index.ts):

- `profileType` ya distingue `artist`, `band` y `editorial`
- `editorialProfile` se deriva en parte desde `owner.editorAccess`
- el perfil editorial se limpia de campos musicales

### Utilidades y permisos

En [src/utilities/isEditorialUser.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/utilities/isEditorialUser.ts):

- un editor se detecta con `role === 'creator'` y `editorAccess === true`
- un creador musical se detecta con `role === 'creator'` y `editorAccess === false`
- un fan se detecta via `userType`

Este patron esta distribuido hoy en acceso al dashboard, filtros, comentarios, posts y componentes del admin.

## Decision propuesta

La identidad editorial debe quedar explicita en `userType`, no solo en `editorAccess`.

### Modelo objetivo

#### `role`

`role` debe quedar reservado para permisos globales:

- `admin`
- `creator`

No propongo mover editor a `role: 'editor'` en esta fase, porque eso toca demasiadas reglas que hoy dependen de `role === 'creator'`.

#### `userType`

`userType` debe pasar a ser la fuente de verdad funcional del tipo de usuario:

- `artist`
- `band`
- `editor`
- `fan`

#### `accountType`

`accountType` debe quedar solo para compatibilidad temporal y solo para cuentas musicales:

- `artist`
- `band`
- `null` para editor
- `null` para fan

#### `editorAccess`

`editorAccess` debe mantenerse solo como bandera legacy de compatibilidad temporal.

Durante la migracion:

- un editor nuevo debe persistir `userType: 'editor'`
- un editor legado con `editorAccess: true` debe seguir funcionando
- las utilidades deben aceptar ambos estados

Cuando toda la app use `userType: 'editor'`, `editorAccess` podra deprecarse y eliminarse.

## Por que no mover editor a `role: 'editor'` ahora

Hacer eso hoy seria mas riesgoso que beneficioso.

Motivo:

- hay varias reglas que abren o cierran acceso con `role === 'creator'`
- cambiar `role` implicaria revisar auth, dashboard, logout, comments, posts, pages, biografias, commerce y filtros
- el cambio es valido a nivel conceptual, pero no es el mejor primer paso si la prioridad es no romper nada

Conclusión:

- `userType: 'editor'` da claridad semantica
- `role: 'creator'` mantiene compatibilidad operativa
- despues, en una segunda migracion, se puede evaluar si `role` tambien debe refinarse

## Requerimientos funcionales

### 1. Nuevos editores

Cuando admin crea un editor:

- `role` debe seguir siendo `creator`
- `userType` debe quedar en `editor`
- `editorAccess` debe quedar en `true` mientras exista compatibilidad legacy
- `accountType` debe quedar en `null`
- el perfil asociado debe quedar como `profileType: 'editorial'`

### 2. Artistas y bandas

Cuando se crea o edita una cuenta musical:

- `role` debe seguir siendo `creator`
- `userType` debe ser `artist` o `band`
- `editorAccess` debe quedar en `false`
- `accountType` debe reflejar `artist` o `band`
- el perfil asociado debe quedar con `profileType` musical consistente

### 3. Fans

Para fans:

- `role` debe seguir siendo `creator` mientras ese sea el contrato actual del proyecto
- `userType` debe ser `fan`
- `editorAccess` debe ser `false`
- `accountType` debe ser `null`

### 4. Deteccion de editor

La deteccion editorial debe cambiar a este orden:

1. si `userType === 'editor'`, es editor
2. si `userType` aun no existe pero `editorAccess === true`, tambien es editor legacy
3. cualquier otra combinacion no debe considerarse editorial

## Requerimientos tecnicos

### Fuente unica de verdad

La fuente de verdad nueva debe ser `userType`.

`editorAccess` no debe seguir siendo la base de decisiones nuevas; solo un fallback transitorio.

### Backward compatibility

Durante la migracion, toda logica editorial debe aceptar:

- cuentas nuevas con `userType: 'editor'`
- cuentas antiguas con `editorAccess: true`

### Migracion no destructiva

No se debe eliminar ni reinterpretar masivamente data sin respaldo.

La migracion debe:

- completar `userType` faltante
- no romper usuarios verificados
- no alterar passwords
- no tocar tokens de auth
- no cambiar `profile.id` ni relaciones con `posts`

## Propuesta de implementacion

## Fase 1. Normalizar el modelo sin romper compatibilidad

Actualizar la logica de defaults en [src/collections/Users/hooks/ensureCreatorDefaults.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Users/hooks/ensureCreatorDefaults.ts):

- si `editorAccess === true`, forzar `userType = 'editor'`
- si `accountType === 'band'`, usar `userType = 'band'`
- si `accountType === 'artist'`, usar `userType = 'artist'`
- si es fan, usar `userType = 'fan'`

Resultado:

- toda cuenta nueva empieza a nacer con semantica consistente
- no cambia aun la compatibilidad de acceso

## Fase 2. Introducir helpers canonicos

Centralizar las reglas en [src/utilities/isEditorialUser.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/utilities/isEditorialUser.ts):

- `isEditorialUser(user)`
- `isMusicalCreatorUser(user)`
- `isFanUser(user)`
- `canAccessPayloadDashboard(user)`

Nuevas reglas:

- `isEditorialUser`: `userType === 'editor' || editorAccess === true`
- `isMusicalCreatorUser`: `role === 'creator'` y `userType` en `artist | band`, con fallback legacy a `!editorAccess && accountType`
- `isFanUser`: `userType === 'fan'`

Objetivo:

- dejar de repetir condiciones ambiguas en componentes y collections

## Fase 3. Migrar consumidores de la identidad

Reemplazar condiciones directas repartidas por el proyecto:

- `user?.editorAccess`
- `user?.role === 'creator' && !user?.editorAccess`
- `user?.userType === 'creator'`

por helpers compartidos.

Zonas sensibles detectadas:

- [src/access/payloadDashboardAccess.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/access/payloadDashboardAccess.ts)
- [src/collections/Posts/index.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Posts/index.ts)
- [src/collections/Biographies/index.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Biographies/index.ts)
- [src/components/BeforeDashboard/index.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/components/BeforeDashboard/index.tsx)
- [src/components/CreatorCollectionFilter/index.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/components/CreatorCollectionFilter/index.tsx)
- [src/components/CreatorBiographyListRedirect/index.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/components/CreatorBiographyListRedirect/index.tsx)
- [src/components/CreatorCommentsListView/shared.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/components/CreatorCommentsListView/shared.ts)
- [src/utilities/creatorProfiles.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/utilities/creatorProfiles.ts)
- [src/utilities/editorInvites.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/utilities/editorInvites.ts)

## Fase 4. Migracion de datos existente

Crear una migracion segura de usuarios ya existentes:

- si `editorAccess === true` y `userType !== 'editor'`, actualizar `userType = 'editor'`
- si `editorAccess === false` y `accountType === 'artist'`, actualizar `userType = 'artist'`
- si `editorAccess === false` y `accountType === 'band'`, actualizar `userType = 'band'`
- si el usuario fan sigue con `userType = 'creator'` por legado, migrarlo a `fan` solo si el flujo consumer actual lo confirma

Importante:

- correr primero en entorno local o staging
- registrar conteos antes y despues
- no migrar admins

## Fase 5. Ajuste de formularios de admin

En `Users`:

- la UI de editor debe mostrar identidad editorial real
- `userType` no debe quedar editable libremente si eso permite estados invalidos
- `accountType` no debe aparecer para editores
- `editorAccess` puede seguir oculto o bloqueado cuando el flujo sea editorial

Objetivo:

- evitar combinaciones imposibles como `userType: editor` con `accountType: band`

## Fase 6. Deprecacion de `editorAccess`

Solo cuando todas las reglas usen `userType: 'editor'`:

- marcar `editorAccess` como legacy
- retirar dependencias directas
- evaluar eliminacion del campo en una version posterior

No debe eliminarse en la misma entrega donde se migra la semantica.

## Criterios de aceptacion

- Un editor nuevo queda guardado con `userType: 'editor'`
- Un editor ya existente con `editorAccess: true` sigue funcionando sin cambios visibles
- Un artista o banda no se clasifica accidentalmente como editor
- Un editor puede seguir entrando al dashboard y administrar sus posts
- Un artista o banda conserva biografia, imagenes y perfil sin regresiones
- Los fans no reciben acceso al dashboard editorial
- Los perfiles publicos editoriales siguen resolviendo nombre, avatar, bio y red social

## Casos de prueba sugeridos

1. Crear editor desde admin y verificar `role: creator`, `userType: editor`, `editorAccess: true`.
2. Crear artista y verificar `role: creator`, `userType: artist`, `editorAccess: false`.
3. Crear banda y verificar `role: creator`, `userType: band`, `editorAccess: false`.
4. Validar que un editor legacy con `editorAccess: true` siga pudiendo entrar al dashboard.
5. Validar que `Posts` permita crear y editar solo a admin y editor.
6. Validar que `Biographies` siga disponible solo para creadores musicales.
7. Validar que `Comments` mantenga el alcance correcto para editor, artista/banda y admin.
8. Validar que el logout siga redirigiendo a la pantalla correcta segun tipo de usuario.

## Riesgos

- Hay condiciones hardcodeadas con `role === 'creator'` en varios puntos.
- Hay codigo legacy que todavia interpreta `userType: 'creator'`.
- Una migracion incompleta podria dejar cuentas editoriales fuera del dashboard o, peor, dar acceso editorial a cuentas musicales.

## Mitigaciones

- Introducir helpers primero
- migrar datos despues
- remover condiciones directas al final
- cubrir con pruebas de acceso antes de limpiar campos legacy

## Fuera de alcance en este spec

- Cambiar `role` de editor a `editor` en esta primera fase
- Rediseñar la UI visual de perfiles editoriales
- Reestructurar completamente `Profiles` en colecciones separadas
- Eliminar inmediatamente `editorAccess`

## Recomendacion final

La ruta mas segura es:

1. mantener `role: 'creator'`
2. mover la identidad real del editor a `userType: 'editor'`
3. dejar `editorAccess` como compatibilidad temporal
4. migrar reglas y datos por fases
5. retirar legacy solo cuando las pruebas cierren

Esa estrategia mejora el modelo sin poner en riesgo lo que ya esta funcionando.
