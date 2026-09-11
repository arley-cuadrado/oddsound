# Oddsound Consumer Identity Phase 0 Review Notes

## Objetivo

Documento breve para revisar `Phase 0` con criterio ejecutivo antes de abrir una rama de implementación.

Fecha de referencia: August 23, 2026.

## Qué debe quedar aprobado

### 1. Identidad

- un consumidor tiene una sola cuenta para comentar, comprar y ver tracking
- `users` sigue siendo base de autenticación
- `consumerProfiles` existe como colección separada

### 2. Entrada de autenticación

- el flujo actual de artista o banda se mantiene separado
- aparecen dos enlaces de texto simples:
  - regístrate como artista o banda
  - regístrate como consumer
- `consumer` no aparece en dropdowns, selects o mezclas dentro del formulario musical
- el flujo de `consumer` usa Google como entrada principal

### 3. Comentarios

- comentarios autenticados en MVP
- colección separada
- moderación cerrada antes de desarrollo

### 4. Compras

- login obligatorio cuando la compra deba persistir en historial
- órdenes y transacciones ligadas a identidad interna
- Mercado Pago sigue siendo proveedor, no identidad principal

### 5. UI obligatoria

- comentarios heredan de `Release`
- compras, historial y tracking heredan de `Shop`
- “Mi cuenta” combina ambos sin crear un tercer sistema visual

### 6. Arquitectura

- comentarios no bloquean render principal del release
- shop no mezcla datos privados en lectura pública
- checkout no se carga con escrituras secundarias pesadas
- índices y consultas acotadas desde el inicio
- misma base de datos en esta etapa; separación por colecciones, no por infraestructura

### 7. Observabilidad mínima

- medir latencia de comentario
- medir latencia de checkout
- medir latencia de `Mi cuenta`
- registrar errores de identidad Google
- registrar errores de conciliación de órdenes y transacciones

### 8. Alcance exacto de `Mi cuenta` v1

- mis comentarios
- mis compras
- tracking y estado
- sin preferencias avanzadas en MVP

## Estado recomendado

- `Phase 0` listo para abrir rama cuando se decida pasar a implementación
