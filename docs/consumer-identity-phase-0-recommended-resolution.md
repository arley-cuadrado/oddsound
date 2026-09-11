# Oddsound Consumer Identity Phase 0 Recommended Resolution

## Objetivo

Proponer una resolución concreta para cerrar `Phase 0` y saber qué puede aprobarse ya, qué sigue pendiente y qué bloquea abrir rama.

Fecha de referencia: August 23, 2026.

## Resumen ejecutivo

Recomendación actual:

- `approved now`: 20 puntos
- `approve with final wording`: 0 puntos
- `still open but bounded`: 0 puntos

La rama puede abrirse una vez quieras pasar de planeación a implementación.

## Resolución recomendada por área

### Producto

#### P0-01. Identidad única de consumidor

Recomendación:

- `approved`

Resolución:

- Oddsound tendrá una sola identidad de consumidor para comentar, comprar y ver tracking.

#### P0-04. consumerProfiles separados

Recomendación:

- `approved`

Resolución:

- se crea colección `consumerProfiles`
- no se usa `profiles` para consumidores

#### P0-07. Comentarios autenticados

Recomendación:

- `approved`

Resolución:

- el MVP no usa comentarios anónimos como flujo principal

### Auth

#### P0-02. Entry points separados

Recomendación:

- `approved`

Resolución:

- se mantienen dos enlaces textuales separados:
  - regístrate como artista o banda
  - regístrate como consumer

#### P0-03. Google como auth principal de consumer

Recomendación:

- `approved`

Resolución:

- el flujo principal de `consumer` usa Google
- artista o banda mantiene flujo propio

### UX y UI

#### P0-04 / U0-04. Release como referencia obligatoria

Recomendación:

- `approved`

Resolución:

- comentarios y actividad editorial de consumidor heredan del lenguaje de `Release`

#### P0-05 / U0-05. Shop como referencia obligatoria

Recomendación:

- `approved`

Resolución:

- compras, historial y tracking heredan del lenguaje de `Shop`

#### U0-01. Dos enlaces separados

Recomendación:

- `approved`

Resolución:

- no habrá dropdown ni selector mixto en el flujo musical

#### U0-02. Formulario musical sin consumer

Recomendación:

- `approved`

Resolución:

- el formulario de artista o banda no renderiza `consumer`

#### U0-03. Formulario consumer independiente

Recomendación:

- `approved`

Resolución:

- `consumer` tiene flujo propio asociado a Google

#### U0-06. Mi cuenta sin tercer sistema visual

Recomendación:

- `approved`

Resolución:

- “Mi cuenta” combina patrones de `Release` y `Shop`
- no se diseña un nuevo lenguaje visual

### Arquitectura

#### P0-10 / T0-06 / A0-01..A0-06. Guardrails de performance

Recomendación:

- `approved`

Resolución:

- comentarios no bloquean render principal
- shop no mezcla datos privados en lectura pública
- checkout persiste lo mínimo crítico
- tareas secundarias salen del request crítico
- índices son obligatorios desde el inicio

## Puntos para aprobar con redacción final

## Resoluciones operativas cerradas

### T0-07. Observabilidad mínima del MVP

Resolución:

- medir:
  - latencia de creación de comentario
  - latencia de inicio de checkout
  - latencia de carga de `Mi cuenta`
  - errores de vinculación de identidad
  - errores de conciliación de órdenes y transacciones

### Alcance exacto de “Mi cuenta” v1

Resolución:

- incluir:
  - mis comentarios
  - mis compras
  - tracking y estado
- dejar preferencias y edición avanzada de perfil para fase posterior

## Decisión de apertura de rama

### Puede quedar aprobado ya

- identidad única
- `consumerProfiles`
- comentarios autenticados
- entrypoints separados
- flujo independiente de consumer
- Google como auth principal
- referencia obligatoria de `Release`
- referencia obligatoria de `Shop`
- prohibición de dropdown mixto
- guardrails de performance
- “Mi cuenta” sin tercer sistema visual
- `userType` como segmentación
- login antes de checkout en el MVP
- moderación por admin y artista sobre sus propios releases
- observabilidad mínima del MVP
- alcance exacto de `Mi cuenta` v1

## Recomendación final

Si quieres cerrar `Phase 0` con criterio pragmático, yo haría esto:

1. aprobar hoy todo lo ya estable
2. marcar `Phase 0` como listo
3. abrir rama cuando quieras pasar a ejecución
