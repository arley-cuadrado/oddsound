# Oddsound Consumer Identity Performance and Architecture Notes

## Objetivo

Definir cómo ampliar interacción de consumidores en Oddsound sin degradar:

- la lectura pública de `Release`
- la experiencia de `Shop`
- el checkout
- el tiempo de respuesta del sitio
- la capacidad de crecimiento futura

Fecha de referencia: August 23, 2026.

## Principio base

El módulo de consumidor no puede montarse como lógica pesada embebida en cada render público.

La regla debe ser:

- `Release` y `Shop` siguen siendo rápidos para lectura
- comentarios, compras y tracking añaden valor sin bloquear el flujo principal

## Decisión de infraestructura para esta etapa

Para escalar de forma sana en Oddsound hoy, la mejor decisión no es separar una base de datos nueva para consumidor.

La decisión recomendada es:

- una sola base de datos
- colecciones separadas
- índices correctos
- requests críticos pequeños
- tareas secundarias desacopladas

La separación a otra base solo debe evaluarse después, cuando existan señales reales de saturación o aislamiento necesario.

## Nota de coordinación con pagos

La implementación específica de Mercado Pago vive en una rama separada.

Para esta línea de trabajo:

- se define cómo el módulo de consumidor consumirá órdenes, transacciones y tracking
- no se acopla la planificación de performance a detalles todavía inestables de la rama de pagos
- el merge posterior debe respetar estas reglas y no introducir lógica pesada en `Release`, `Shop` o checkout

## Riesgos de performance si se implementa mal

### 1. Cargar demasiadas relaciones en cada release

Riesgo:

- consultar comentarios, consumidor, artista, compra verificada y agregados complejos en el mismo render del release

Impacto:

- aumenta latencia
- empeora caché
- vuelve más costosa la lectura pública

### 2. Acoplar checkout a demasiada lógica previa

Riesgo:

- validar en tiempo real demasiadas relaciones antes de iniciar compra

Impacto:

- checkout lento
- mayor probabilidad de fallo

### 3. Hacer writes síncronos innecesarios

Riesgo:

- al comentar o comprar, disparar demasiadas actualizaciones relacionadas dentro del mismo request

Impacto:

- requests lentos
- timeouts
- más carga sobre base de datos

### 4. No preparar índices

Riesgo:

- búsquedas frecuentes por release, artista, consumidor o estado sin índices adecuados

Impacto:

- degradación progresiva conforme crecen comentarios y órdenes

## Reglas de arquitectura recomendadas

### 1. Separar lectura crítica de lectura secundaria

Para `Release`:

- la página principal debe renderizar primero el contenido editorial del release
- los comentarios deben entrar como módulo desacoplado, con consulta acotada y paginada
- no cargar historial completo de comentarios en la respuesta inicial

Para `Shop`:

- catálogo y CTA de compra siguen siendo prioridad
- historial de consumidor y tracking no deben mezclarse con la consulta pública del shop

### 2. Mantener consultas pequeñas y dirigidas

Regla:

- cada vista debe pedir solo lo que necesita

Aplicación:

- `Release` pide comentarios publicados paginados
- `Mi cuenta` pide comentarios y compras del usuario autenticado
- panel operativo pide listas filtradas con índices adecuados

### 3. Usar colecciones separadas

Recomendación:

- `comments` separada de `pages`
- `consumerProfiles` separada de `profiles`

Ventaja:

- evita inflar documentos críticos
- reduce complejidad de lectura y escritura

### 4. Evitar joins pesados en el camino crítico

Regla:

- no depender de relaciones profundas en el render principal de release o shop

Preferencia:

- relaciones mínimas en lectura crítica
- campos denormalizados pequeños cuando aporten velocidad y no rompan integridad

### 5. Escribir rápido, procesar después

Regla:

- el request principal debe persistir lo mínimo indispensable

Ejemplos:

- guardar comentario con estado y relaciones mínimas
- guardar orden local con claves principales
- dejar tareas derivadas para procesamiento posterior

## Estrategia recomendada por flujo

### Comentarios

Camino crítico:

- autenticar
- validar release publicado
- persistir comentario
- devolver estado al usuario

Fuera del camino crítico:

- agregados por release
- métricas de actividad
- notificaciones al artista
- enriquecimiento de auditoría

### Compras

Camino crítico:

- autenticar consumidor
- validar producto y perfil necesarios
- crear orden mínima local
- iniciar flujo de pago

Fuera del camino crítico:

- analytics
- métricas por artista
- enriquecimiento de tracking
- resúmenes para dashboard

## Índices mínimos recomendados

### `comments`

- `release + status + createdAt`
- `artistProfile + status + createdAt`
- `consumerProfile + createdAt`
- `authorUser + createdAt`

### `consumerProfiles`

- `owner` unique
- `email`
- `lastPurchaseAt`

### `orders`

- `user + updatedAt`
- `consumerProfile + updatedAt`
- `artistProfile + updatedAt`
- `paymentProviderOrderId`
- `paymentProviderPaymentId`

### `transactions`

- `consumerProfile + updatedAt`
- `providerEventId`
- `paymentProviderPaymentId`

## Estrategia de caché y render

### Release público

- mantener caché del contenido editorial principal
- comentarios con carga segmentada y paginada
- evitar invalidar todo el release por cada comentario nuevo si no es necesario

### Shop público

- mantener lectura rápida del catálogo
- no contaminar la consulta pública con datos privados del consumidor

### Mi cuenta

- vista autenticada sin aspirar a la misma cachabilidad de páginas públicas
- consultas directas pero acotadas y específicas del usuario

## Estrategia de crecimiento

### Fase actual

- modular monolith bien indexado
- queries pequeñas
- separación clara entre colecciones
- una sola base de datos compartida por ahora

### Fase siguiente

- colas para tareas derivadas
- agregados o snapshots para métricas
- mejores rutas de observabilidad

### Fase posterior

- desacople mayor de módulos sociales y de commerce si el volumen lo exige
- búsqueda especializada para actividad si aparece discover social
- evaluación de separación física de infraestructura solo con métricas reales

## Reglas de implementación para no degradar el sitio

- no cargar comentarios completos dentro del documento de release
- no recalcular métricas costosas en cada request público
- no bloquear checkout con escritura secundaria innecesaria
- no mezclar datos privados de consumidor dentro de queries públicas
- no introducir componentes visuales que necesiten más datos de los realmente útiles para la vista

## Señales de alerta técnica

Si aparecen estos síntomas, la arquitectura se está degradando:

- release tarda claramente más después de introducir comentarios
- shop necesita múltiples relaciones profundas para renderizar
- cada compra dispara demasiadas escrituras síncronas
- la moderación depende de consultas sin índice
- el estado de “Mi cuenta” obliga a leer demasiadas colecciones con payload profundo

## Recomendación final

La ampliación social y comercial de Oddsound debe construirse con una regla simple:

- lectura pública rápida
- escritura crítica corta
- tareas derivadas desacopladas
- colecciones separadas
- índices definidos desde el inicio
- misma base de datos hasta que métricas reales demuestren lo contrario

Eso permite crecer en interacción sin sacrificar la experiencia actual de `Release`, `Shop` ni los flujos de compra.
