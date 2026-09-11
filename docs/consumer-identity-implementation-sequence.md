# Oddsound Consumer Identity Implementation Sequence

## Objetivo

Convertir el backlog técnico del módulo de consumidor en una secuencia priorizada de trabajo con dependencias claras.

Fecha de referencia: August 23, 2026.

## Reglas base de esta secuencia

- No mezclar `consumer` dentro del formulario de artista o banda.
- Mantener dos entradas textuales separadas para autenticación:
  - regístrate como artista o banda
  - regístrate como consumer
- El flujo de `consumer` debe ser independiente y asociado a Google.
- Toda vista nueva debe heredar de `Release`, `Shop` o ambos.
- La integración técnica de Mercado Pago se desarrolla en una rama separada y se consolidará después por merge.

## Phase 0. Product Lock

### Objetivo

Congelar decisiones funcionales antes de abrir implementación.

### Tareas

1. Cerrar el modelo de segmentación de usuario en `users`.
2. Cerrar política de login obligatorio para comentar.
3. Cerrar política de login obligatorio para comprar.
4. Cerrar política de moderación inicial.
5. Cerrar arquitectura de entrypoints separados para creador y consumer.
6. Cerrar alcance exacto del MVP de “Mi cuenta”.

### Salida esperada

- decisiones aprobadas
- alcance del MVP cerrado
- bloqueos de producto resueltos

## Phase 1. Consumer Identity Foundation

### Objetivo

Preparar la base de datos y el modelo de identidad interna del consumidor.

### Tareas

1. Extender `users` con la segmentación necesaria para `consumer`.
2. Crear `consumerProfiles`.
3. Diseñar sincronización `user <-> consumerProfile`.
4. Revisar access control para evitar regresiones con creator/admin.

### Dependencias

- Phase 0 completa

### Riesgo principal

- contaminar el modelo actual de artista o banda

## Phase 2. Consumer Auth Entry

### Objetivo

Definir y luego implementar el acceso separado del consumidor.

### Tareas

1. Especificar las pantallas o shells donde aparecerán los dos enlaces textuales.
2. Mantener intacto el flujo actual de artista o banda como flujo musical.
3. Crear el flujo independiente de `consumer`.
4. Asociar el flujo de `consumer` a Google como método principal.

### Restricciones

- sin dropdown de tipos de cuenta en el formulario musical
- sin selector mixto artist/band/consumer
- sin reinterpretar el shell actual con una UI nueva

### Dependencias

- Phase 1 avanzada en definición de identidad

## Phase 3. Comments Domain

### Objetivo

Introducir comentarios autenticados sobre releases.

### Tareas

1. Crear colección `comments`.
2. Definir access control de lectura, creación y moderación.
3. Conectar comentario con `user`, `consumerProfile`, `release` y `artistProfile`.
4. Diseñar bloque público de comentarios sobre `Release`.

### Restricción visual

- el bloque debe sentirse como extensión del release público actual

### Dependencias

- Phase 1
- Phase 2 si comentar exige login desde el MVP

## Phase 4. Commerce Identity Link

### Objetivo

Unir compras y tracking a la misma identidad interna del consumidor.

### Tareas

1. Extender órdenes para enlazar `user` y `consumerProfile`.
2. Extender transacciones para trazabilidad consistente.
3. Diseñar la política de login previa al checkout.
4. Preparar derivación futura de comprador verificado.

### Restricción visual

- cualquier punto nuevo visible del flujo debe heredar del lenguaje de `Shop`

### Restricción de coordinación

- esta fase define compatibilidad, modelo de datos y tracking
- el wiring final con Mercado Pago depende de la rama separada de pagos

### Dependencias

- Phase 1
- Phase 2 si comprar exige login desde el MVP

## Phase 5. Consumer Account

### Objetivo

Consolidar comentarios y compras en una cuenta útil para el consumidor.

### Tareas

1. Diseñar shell de “Mi cuenta”.
2. Diseñar “Mis comentarios”.
3. Diseñar “Mis compras”.
4. Diseñar “Tracking y estado”.
5. Resolver estados vacíos y errores sin UI nueva.

### Restricción visual

- comentarios heredan de `Release`
- compras y tracking heredan de `Shop`
- la cuenta no puede crear un tercer sublenguaje

### Dependencias

- Phase 3
- Phase 4

## Phase 6. Moderation, Security and QA

### Objetivo

Cerrar la base operativa del módulo antes de release.

### Tareas

1. Aplicar rate limiting.
2. Aplicar reglas anti-spam.
3. Definir observabilidad.
4. Ejecutar pruebas de auth, access control y relaciones.
5. Validar coherencia visual contra `Release` y `Shop`.

### Dependencias

- Phase 3
- Phase 4
- Phase 5

## Orden recomendado de ejecución

1. `Phase 0`
2. `Phase 1`
3. `Phase 2`
4. `Phase 3`
5. `Phase 4`
6. `Phase 5`
7. `Phase 6`

## Criterio de bloqueo por fase

Una fase no debería arrancar si la anterior deja ambiguo alguno de estos puntos:

- segmentación exacta de consumidor
- entrypoint separado de autenticación
- política de login en comentario y compra
- referencia visual obligatoria
- relación consistente entre identidad interna y órdenes
