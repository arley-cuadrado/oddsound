# Oddsound Consumer Identity Technical Backlog

## Objetivo

Traducir el plan funcional de identidad de consumidor, comentarios y comercio conectado en un backlog técnico por etapas, listo para futura ejecución en una rama nueva.

Este backlog no autoriza todavía implementación. Organiza el trabajo.

## Restricción transversal obligatoria

Todo ticket de frontend o dashboard de este backlog debe cumplir estas reglas antes de considerarse listo:

- declarar si hereda de `Release`, `Shop` o ambos
- respetar [specs/styles/spec.md](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/specs/styles/spec.md:1)
- no introducir un lenguaje visual nuevo
- reutilizar estructura, tono y jerarquía ya visibles en `Release` y `Shop`
- no asumir que la vinculación técnica de Mercado Pago se implementa en esta rama; aquí solo se preparan contratos y puntos de integración

## Etapa 0. Definición y alineación

### Ticket 0.1

Título:

- cerrar segmentación de usuario consumidor

Objetivo:

- decidir si `users` se extenderá con `userType`, `role` adicional o ambos

Entregable:

- decisión documentada y validada

### Ticket 0.2

Título:

- cerrar política de autenticación de consumidor

Objetivo:

- definir el flujo oficial de login con Google y cuándo se exige autenticación

Entregable:

- decisión documentada para comentario y compra

### Ticket 0.2.a

Título:

- cerrar arquitectura de entrada separada para creador y consumer

Objetivo:

- definir la presentación exacta de dos enlaces textuales separados en login y registro

Entregable:

- decisión documentada que prohíba mezclar `consumer` dentro del formulario de artista o banda
- confirmación de formulario independiente para `consumer` asociado a Google

### Ticket 0.3

Título:

- cerrar política de moderación

Objetivo:

- definir estado inicial, responsables y permisos de moderación

Entregable:

- matriz de permisos de comentarios

### Ticket 0.4

Título:

- cerrar alcance MVP de “Mi cuenta”

Objetivo:

- decidir qué secciones estarán en la primera versión

Entregable:

- estructura funcional aprobada

### Ticket 0.5

Título:

- validar referencias obligatorias de interfaz

Objetivo:

- dejar explícito que comentarios heredan de `Release` y compras/tracking heredan de `Shop`

Entregable:

- checklist de referencias visuales por módulo

## Etapa 1. Modelo de identidad

### Ticket 1.1

Título:

- extender modelo base de usuario para consumidor

Objetivo:

- preparar `users` para distinguir identidad de consumidor

Trabajo técnico esperado:

- definir campos nuevos
- revisar compatibilidad con lógica actual de creators y admin
- revisar impacto en tipos generados

### Ticket 1.2

Título:

- crear colección `consumerProfiles`

Objetivo:

- modelar datos funcionales del consumidor separados de auth

Trabajo técnico esperado:

- relación `owner -> users`
- campos básicos de identidad y estado
- timestamps e índices
- acceso base

### Ticket 1.3

Título:

- definir hooks de creación y sincronización de perfil consumidor

Objetivo:

- asegurar que la cuenta de consumidor se cree o sincronice correctamente tras login

Trabajo técnico esperado:

- estrategia create-or-link
- sincronización de nombre, email y avatar

### Ticket 1.4

Título:

- validar impacto en access control

Objetivo:

- evitar regresiones con roles actuales de admin, creator y editorial

Trabajo técnico esperado:

- matriz de permisos
- revisión de guards existentes

## Etapa 2. Autenticación con Google

### Ticket 2.1

Título:

- diseñar integración de login con Google

Objetivo:

- definir estrategia técnica de autenticación social compatible con la arquitectura actual

Trabajo técnico esperado:

- flujo de inicio
- callback
- vinculación por email y provider id
- manejo de cuentas existentes

### Ticket 2.2

Título:

- diseñar persistencia de identidad social

Objetivo:

- guardar proveedor, subject id y metadatos mínimos

Trabajo técnico esperado:

- campos persistentes
- validaciones
- prevención de duplicados

### Ticket 2.3

Título:

- definir UX de login obligatorio para consumidor

Objetivo:

- decidir exactamente en qué puntos del flujo se solicita login

Referencias visuales obligatorias:

- `Release` para comentar
- `Shop` para comprar

### Ticket 2.4

Título:

- diseñar entrypoints públicos de autenticación para consumer

Objetivo:

- crear la especificación funcional de enlaces textuales separados para acceso de consumer

Trabajo técnico esperado:

- definir dónde aparece “regístrate como artista o banda”
- definir dónde aparece “regístrate como consumer”
- definir cómo convive esto con el shell actual de auth sin introducir UI nueva
- prohibir dropdowns o selects mixtos dentro del formulario musical

## Etapa 3. Comentarios

### Ticket 3.1

Título:

- crear colección `comments`

Objetivo:

- modelar comentarios autenticados y moderables

Trabajo técnico esperado:

- relaciones con `users`, `consumerProfiles`, `pages` y `profiles`
- estado de moderación
- índices

### Ticket 3.2

Título:

- definir access control de comentarios

Objetivo:

- establecer quién crea, lee, modera y elimina comentarios

Trabajo técnico esperado:

- acceso público de lectura solo para aprobados
- acceso autenticado de creación
- acceso de moderación para actores autorizados

### Ticket 3.3

Título:

- definir servicio de publicación de comentarios

Objetivo:

- asegurar integridad entre release, artista y consumidor

Trabajo técnico esperado:

- validación de release publicado
- resolución de artista relacionado
- prevención de datos huérfanos

### Ticket 3.4

Título:

- diseñar bloque público de comentarios en releases

Objetivo:

- insertar comentarios como extensión natural de `Release`

Restricción visual:

- prohibido crear widget social paralelo

### Ticket 3.5

Título:

- diseñar vista operativa de moderación

Objetivo:

- permitir revisión administrativa o del artista sin romper la UI actual

Restricción visual:

- admin y dashboard deben verse como extensiones del sistema actual

## Etapa 4. Comercio conectado a identidad

### Ticket 4.1

Título:

- extender órdenes para enlazar consumidor autenticado

Objetivo:

- guardar relación entre compra y cuenta interna

Trabajo técnico esperado:

- relación a `user`
- relación a `consumerProfile`
- consistencia con `artistProfile`

Nota de coordinación:

- dejar preparado el modelo aunque la integración final con la rama de Mercado Pago ocurra después

### Ticket 4.2

Título:

- extender transacciones para trazabilidad completa

Objetivo:

- facilitar historial, conciliación y soporte

Trabajo técnico esperado:

- ids externos
- provider event mapping
- relación con consumidor

Nota de coordinación:

- no bloquear este backlog esperando la implementación concreta de la rama separada de pagos

### Ticket 4.3

Título:

- diseñar política de login antes del checkout

Objetivo:

- impedir compras sueltas sin identidad útil para historial

Referencia visual obligatoria:

- `Shop`

### Ticket 4.4

Título:

- diseñar marca de comprador verificado

Objetivo:

- preparar capacidad futura basada en órdenes válidas

Trabajo técnico esperado:

- regla de derivación
- condiciones de consistencia

## Etapa 5. Cuenta del consumidor

### Ticket 5.1

Título:

- diseñar arquitectura de “Mi cuenta”

Objetivo:

- definir shell, navegación y secciones mínimas

Referencias visuales obligatorias:

- `Shop` para compras y tracking
- `Release` para comentarios y actividad editorial

### Ticket 5.2

Título:

- diseñar sección “Mis comentarios”

Objetivo:

- listar comentarios con contexto de release y artista

### Ticket 5.3

Título:

- diseñar sección “Mis compras”

Objetivo:

- mostrar órdenes, items, montos y estado

### Ticket 5.4

Título:

- diseñar sección “Tracking y estado”

Objetivo:

- mostrar fulfillment y guía cuando exista

### Ticket 5.5

Título:

- diseñar estados vacíos y errores

Objetivo:

- resolverlos sin crear UI decorativa nueva

## Etapa 6. Operación, seguridad y calidad

### Ticket 6.1

Título:

- definir rate limits para comentarios

Objetivo:

- prevenir flood y abuso

### Ticket 6.2

Título:

- definir reglas anti-spam iniciales

Objetivo:

- reducir carga de moderación

### Ticket 6.3

Título:

- definir observabilidad de compras y comentarios

Objetivo:

- facilitar soporte y debugging

### Ticket 6.4

Título:

- definir estrategia de pruebas

Objetivo:

- cubrir identidad, comentarios, órdenes y permisos

Trabajo técnico esperado:

- pruebas de auth
- pruebas de access control
- pruebas de integridad de relaciones
- pruebas de vistas críticas

## Dependencias entre etapas

- Etapa 0 desbloquea todas las demás.
- Etapa 1 desbloquea Etapa 2, Etapa 3 y Etapa 4.
- Etapa 2 es requisito práctico para Etapa 3 y Etapa 4 si el MVP exige login.
- Etapa 3 y Etapa 4 alimentan Etapa 5.
- Etapa 6 acompaña transversalmente pero debe cerrarse antes de release.

## Criterio de listo por ticket

Un ticket de este backlog no debería marcarse listo si:

- no deja clara su referencia visual obligatoria
- introduce un patrón UI no presente en `Release` o `Shop`
- crea ambigüedad entre identidad de creador e identidad de consumidor
- deja órdenes o comentarios sin relación consistente con usuario interno
