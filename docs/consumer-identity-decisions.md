# Oddsound Consumer Identity Decisions

## Estado

Documento de decisiones cerradas para la futura implementación del módulo de identidad de consumidor, comentarios y comercio vinculado.

Fecha de referencia: 2026-08-23.

## Decisiones cerradas

### 1. Identidad unificada de consumidor

Decisión:

- Oddsound tendrá una sola identidad de consumidor para comentar, comprar y consultar tracking.

Implicación:

- no se separará una cuenta para comentarios y otra para compras

### 2. Google como login principal del consumidor

Decisión:

- el flujo principal de autenticación del consumidor será login con Google

Implicación:

- se prioriza baja fricción y reutilización de identidad

### 3. Entradas separadas para creador y consumidor

Decisión:

- el acceso de autenticación debe mostrar dos enlaces textuales separados:
  - regístrate como artista o banda
  - regístrate como consumer

Implicación:

- no se usará dropdown, select ni clasificación mixta dentro del formulario musical
- creador y consumer tendrán formularios absolutamente distintos
- el formulario de consumer estará asociado al vínculo de Google

### 4. `users` sigue siendo la base de autenticación

Decisión:

- no se creará una colección auth paralela

Implicación:

- la identidad del consumidor se construirá extendiendo la base actual

### 5. Consumidor separado del artista

Decisión:

- el consumidor no se modelará dentro de `profiles`

Implicación:

- `profiles` sigue reservado para artista, banda y editorial

### 6. Colección dedicada de consumidor

Decisión:

- se creará una colección específica para perfil funcional de consumidor

Nombre de trabajo:

- `consumerProfiles`

### 7. Comentarios autenticados

Decisión:

- el MVP de comentarios requerirá autenticación

Implicación:

- no se adopta como flujo principal el formulario anónimo de nombre, email y comentario

### 8. Comentarios como colección independiente

Decisión:

- los comentarios se modelarán en una colección propia

Implicación:

- se facilita moderación, auditoría, paginación y trazabilidad

### 9. Compras asociadas a identidad interna

Decisión:

- las órdenes y transacciones deben quedar asociadas al `user` y al `consumerProfile`

Implicación:

- Mercado Pago sigue siendo proveedor de pago, no proveedor principal de identidad

### 9.a. Coordinación con rama separada de Mercado Pago

Decisión:

- la vinculación técnica de Mercado Pago no se desarrolla en esta rama de consumidor

Implicación:

- esta línea de trabajo deja definidos contratos, tracking, vistas, campos y dependencias
- la conexión final con Mercado Pago se completará después del merge con la rama de pagos

### 10. Checkout con identidad consistente

Decisión:

- para el MVP se prioriza exigir login antes del checkout cuando la compra deba quedar reflejada en historial y tracking del consumidor

Implicación:

- se evita reconciliación débil posterior solo por email

### 11. Comprador verificado como capacidad futura controlada

Decisión:

- el estado de comprador verificado debe derivarse de órdenes válidas y no de campos manuales

Implicación:

- no se marca manualmente desde admin

### 12. Moderación inicial obligatoria

Decisión:

- los comentarios del MVP se publicarán con moderación básica

Estado inicial recomendado:

- `pending`

### 13. Referencia visual obligatoria

Decisión:

- `Release` y `Shop` son entidades visuales obligatorias para cualquier módulo nuevo relacionado con comentarios, consumo, compras, tracking o cuenta de consumidor

Implicación:

- no se permite inventar una UI paralela

### 14. Cumplimiento estricto del spec

Decisión:

- [specs/styles/spec.md](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/specs/styles/spec.md:1) se considera restricción obligatoria de implementación

Implicación:

- cualquier módulo nuevo debe declarar explícitamente si hereda de `Release`, `Shop` o ambos

### 15. Estrategia de base de datos para consumidor

Decisión:

- el módulo de consumidor se implementa dentro de la misma base de datos de Payload/Mongo, usando colecciones separadas

Implicación:

- no se crea una base de datos aparte para consumidores en esta etapa
- la separación se resuelve a nivel de modelo, índices y consultas
- una futura separación de infraestructura solo se evaluará si métricas reales de volumen y operación lo justifican

## Decisiones abiertas pero encaminadas

### 1. Campo exacto de segmentación en `users`

- resuelta

Decisión final:

- introducir `userType` para segmentar `consumer` sin sobrecargar `role`

Implicación:

- `role` conserva su semántica administrativa y operativa actual
- `userType` modela identidad de producto
- la cuenta de consumidor no se mezclará con la clasificación de artista o banda

### 2. Moderación por artista o solo admin

- resuelta

Decisión final:

- admin puede moderar siempre
- el artista propietario del release puede moderar comentarios sobre sus propios releases

Implicación:

- la autoridad de moderación queda acotada por ownership
- el artista no puede editar el contenido del comentario, solo aprobar o rechazar según la política definida

### 3. Alcance exacto de “Mi cuenta”

- resuelta

Decisión final:

- `Mi cuenta` v1 incluye:
  - mis comentarios
  - mis compras
  - tracking y estado de pedidos

Implicación:

- preferencias avanzadas y edición ampliada de perfil quedan fuera del MVP
- la primera versión se concentra en valor operativo inmediato para el consumidor

### 4. Nivel de tracking del MVP

- resuelta

Decisión final:

- el MVP expone estado del pedido y, cuando exista, transportadora y número de guía

Implicación:

- tracking visible desde la primera versión si los datos ya están disponibles
- no se posterga la utilidad principal de seguimiento

### 5. Login antes del checkout

- resuelta

Decisión final:

- el MVP exigirá login antes del checkout cuando la compra deba quedar reflejada en historial y tracking del consumidor

Implicación:

- se evita reconciliación débil posterior por email
- se preserva consistencia para historial, tracking y futuro comprador verificado

### 6. Observabilidad mínima del MVP

- resuelta

Decisión final:

- el MVP debe monitorear como mínimo:
  - latencia de creación de comentario
  - latencia de inicio de checkout
  - latencia de carga de `Mi cuenta`
  - errores de login o vinculación de identidad Google
  - errores de conciliación entre órdenes y transacciones

Implicación:

- no se despliega el módulo sin baseline mínima de performance y errores

## Criterio de bloqueo

No se debería abrir desarrollo de implementación si falta definición en alguno de estos puntos:

- referencia visual obligatoria de cada vista nueva
