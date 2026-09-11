# Consumer Identity Merge Pending

Fecha de corte: August 23, 2026.

## Obligatorio antes del merge final

1. Hacer merge controlado con la rama separada de Mercado Pago.
2. Verificar que `orders` y `transactions` preserven `consumerProfile`, `customer`, `release` y futuros estados de tracking.
3. Revisar conflictos en login, checkout y callbacks de pago para no romper el flujo actual de `Shop`.
4. Confirmar que el mismo correo no pueda existir como `creator` y como `consumer` en ningún escenario.
5. Validar visualmente `consumer/login`, `consumer/register`, comentarios en `Release` y `consumer/account` contra el spec obligatorio de `Release` + `Shop`.

## Pendientes técnicos

1. Revisar índices adicionales en commerce para consultas por `consumerProfile`, `customer`, `artistProfile`, `release`, `status` y `updatedAt`.
2. Cerrar la validación end-to-end del flujo completo después del merge de pagos:
   - Google login consumer
   - comentario sobre release
   - orden creada desde `Shop`
   - orden visible en `Mi cuenta`
   - tracking visible cuando aplique
3. Confirmar si la moderación operativa diaria de comentarios queda en admin solamente o también en artista.

## Regla cerrada de identidad

1. Un correo asociado a artista o banda no puede reutilizarse para `consumer`.
2. Un correo asociado a `consumer` no puede reutilizarse para artista o banda.
3. La identidad interna de `consumer` sigue separada de `creator`, aunque ambas vivan en la misma colección `users`.
