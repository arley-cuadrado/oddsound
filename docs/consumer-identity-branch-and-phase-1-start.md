# Oddsound Consumer Identity Branch and Phase 1 Start

## Objetivo

Definir cómo abrir la rama del módulo de consumidor sin cruzarse con la rama separada de Mercado Pago y dejar claro el orden exacto de arranque de `Phase 1`.

Fecha de referencia: August 23, 2026.

## Propuesta de rama

Nombre recomendado:

- `feature/consumer-identity-foundation`

Alternativas válidas:

- `feature/consumer-comments-account`
- `feature/consumer-identity-v1`

Recomendación:

- usar `feature/consumer-identity-foundation`

Razón:

- refleja que la rama construye base de identidad, comentarios y cuenta
- no promete integrar el wiring completo de Mercado Pago
- evita confusión con la rama separada de pagos

## Regla de coordinación con la rama de pagos

Esta rama no debe:

- implementar el wiring final de Mercado Pago
- reescribir la lógica de pagos en curso
- bloquearse esperando merge de pagos

Esta rama sí debe:

- dejar listos contratos y campos de identidad
- preparar órdenes y transacciones para vincular consumidor
- definir tracking dentro de `Mi cuenta`
- respetar que el merge posterior complete el wiring real de pagos

## Alcance exacto de esta rama

### Incluye

- segmentación de `consumer` en `users` con `userType`
- colección `consumerProfiles`
- base de auth para `consumer`
- diseño e implementación de comentarios autenticados
- diseño e implementación de `Mi cuenta` v1
- estructura de datos para compras y tracking del consumidor

### No incluye

- implementación final de Mercado Pago
- cambios invasivos sobre la rama de pagos
- refactor general del commerce actual más allá de lo necesario para compatibilidad

## Orden exacto de arranque para Phase 1

### Paso 1. Crear base de segmentación en `users`

Objetivo:

- introducir `userType`

Resultado esperado:

- el sistema distingue `creator`, `consumer` y cualquier otra semántica necesaria sin dañar `role`

### Paso 2. Crear `consumerProfiles`

Objetivo:

- separar identidad auth de datos funcionales del consumidor

Resultado esperado:

- relación `owner -> users`
- estructura preparada para compras, comentarios y tracking

### Paso 3. Revisar access control actual

Objetivo:

- evitar que el nuevo tipo de usuario rompa flujos existentes

Resultado esperado:

- matriz de permisos revisada para admin, creator y consumer

### Paso 4. Regenerar tipos y validar compatibilidad

Objetivo:

- asegurar coherencia de tipos antes de tocar frontend

Resultado esperado:

- modelo base estable para continuar con auth y comentarios

## Gate de salida de Phase 1

`Phase 1` no debería marcarse completa hasta que:

- `users` soporte `consumer` con `userType`
- exista `consumerProfiles`
- access control no rompa creator/admin
- tipos estén regenerados y revisados
- no haya dependencia dura con la rama de pagos

## Riesgos a vigilar al abrir la rama

### 1. Mezclar lógica de consumer con creator

Mitigación:

- conservar separación estricta de formularios, rutas y semántica de cuenta

### 2. Acoplar demasiado pronto la rama a Mercado Pago

Mitigación:

- trabajar por contratos de datos y no por wiring final

### 3. Introducir UI nueva por presión de cuenta de usuario

Mitigación:

- mantener `Release` y `Shop` como referencias obligatorias

### 4. Romper permisos actuales

Mitigación:

- revisar guards y access control antes de avanzar a comentarios o cuenta

## Checklist de apertura de rama

- `Phase 0` cerrado
- rama de pagos reconocida como dependencia externa
- nombre de rama aprobado
- alcance de esta rama aprobado
- orden de arranque de `Phase 1` aprobado
