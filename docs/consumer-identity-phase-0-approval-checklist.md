# Oddsound Consumer Identity Phase 0 Approval Checklist

## Objetivo

Checklist de aprobación previa a apertura de rama para el módulo de consumidor, comentarios y comercio conectado.

Fecha de referencia: August 23, 2026.

## Uso

Este checklist debe aprobarse antes de iniciar implementación.

Estado sugerido por ítem:

- `pending`
- `approved`
- `blocked`

## Aprobación de producto

| ID | Tema | Criterio | Estado | Notas |
|---|---|---|---|---|
| P0-01 | Identidad | Existe una sola identidad de consumidor para comentar, comprar y ver tracking. | approved | |
| P0-02 | Auth | `users` sigue siendo la base de autenticación. | approved | |
| P0-03 | Segmentación | Está cerrada la estrategia exacta para distinguir `consumer` de `creator`. | approved | `userType` se usará para identidad de producto |
| P0-04 | Perfil consumidor | Se aprueba crear `consumerProfiles` como colección separada. | approved | |
| P0-05 | Comentarios | Los comentarios del MVP requieren autenticación. | approved | |
| P0-06 | Compras | El checkout del MVP exige login cuando la compra deba quedar en historial. | approved | |
| P0-07 | Moderación | Está aprobada la política inicial de moderación. | approved | admin siempre; artista sobre sus propios releases |
| P0-08 | Comprador verificado | Está aprobada la lógica futura de derivación desde órdenes válidas. | approved | |

## Aprobación de UX

| ID | Tema | Criterio | Estado | Notas |
|---|---|---|---|---|
| U0-01 | Entry points | Existen dos enlaces de texto separados para acceso: artista o banda / consumer. | approved | |
| U0-02 | Formulario musical | El formulario de artista o banda no incluye `consumer` en dropdowns, selects ni switches. | approved | |
| U0-03 | Formulario consumer | El flujo de `consumer` es independiente y está asociado a Google. | approved | |
| U0-04 | Release | El módulo de comentarios hereda del lenguaje visual de `Release`. | approved | |
| U0-05 | Shop | Compras, historial y tracking heredan del lenguaje visual de `Shop`. | approved | |
| U0-06 | Mi cuenta | La cuenta del consumidor no crea un tercer lenguaje visual. | approved | |
| U0-07 | Spec | Cada vista nueva declara explícitamente si hereda de `Release`, `Shop` o ambos. | approved | |

## Aprobación técnica

| ID | Tema | Criterio | Estado | Notas |
|---|---|---|---|---|
| T0-01 | Data model | Está aprobado el modelo base de `user`, `consumerProfile`, `comments`, `orders` y `transactions`. | approved | `userType` + `consumerProfiles` + `comments` separados |
| T0-02 | Access control | Está aprobada la matriz inicial de permisos para lectura, creación y moderación. | approved | admin siempre; artista sobre sus propios releases |
| T0-03 | Integración social | Está aprobada la estrategia de login con Google y vinculación de cuentas. | approved | |
| T0-04 | Comercio | Está aprobada la asociación de órdenes y transacciones a identidad interna. | approved | |
| T0-05 | Trazabilidad | Está aprobado el modelo para relacionar consumidor, release, artista y compra. | approved | |
| T0-06 | Performance | Está aprobada la estrategia para no degradar `Release`, `Shop` ni checkout. | approved | |
| T0-07 | Observabilidad | Está aprobado qué se va a monitorear desde el MVP. | approved | latencia de comentarios, checkout, mi cuenta, errores de identidad y conciliación |
| T0-08 | Testing | Está aprobado el alcance de pruebas mínimas por fase. | approved | |

## Aprobación de arquitectura y escalabilidad

| ID | Tema | Criterio | Estado | Notas |
|---|---|---|---|---|
| A0-01 | Lectura pública | Los comentarios no bloquean el render principal del release. | approved | |
| A0-02 | Checkout | El flujo de compras no depende de consultas pesadas sin caché. | approved | |
| A0-03 | Escritura | Comentarios y eventos de compra tienen rutas de escritura acotadas y rápidas. | approved | |
| A0-04 | Índices | Están definidos índices para comentarios, órdenes y relaciones principales. | approved | |
| A0-05 | Desacople | Las tareas secundarias se resuelven fuera del request crítico cuando sea posible. | approved | |
| A0-06 | Growth | Existe plan para cache, colas, búsqueda y agregados futuros. | approved | |

## Criterio de apertura de rama

No abrir rama de implementación hasta que:

- no existan ítems `blocked`
- los criterios críticos de auth, UI, data model y performance estén `approved`
- observabilidad mínima del MVP quede instrumentada en su fase correspondiente
