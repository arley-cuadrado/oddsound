# Oddsound Creator Registration and Verification Spec

Fecha de referencia: August 30, 2026.

## Objetivo

Definir el contrato funcional y técnico del registro de artistas y bandas en Oddsound, desde la creación inicial hasta la verificación de correo y el primer login.

Este spec existe para evitar tres regresiones que ya vimos en preview y producción:

1. errores de registro que muestran fallo aunque la cuenta sí se cree
2. correos de verificación que apuntan al host equivocado
3. pantallas de verify que muestran `Verification token is invalid.` en casos que no son un error real para el usuario

## Alcance

Aplica a:

- registro público de `artist`
- registro público de `band`
- reenvío de correo de verificación
- validación de enlace de verificación
- login creator posterior a la verificación
- comportamiento en `localhost`, `Preview` y `Production`

No aplica a:

- invitaciones de editor
- login de admin
- login fan con Google, excepto en la matriz final de smoke tests compartidos

## Tipos y segmentación

## Cuenta creator válida

Una cuenta creator pública válida debe cumplir:

- `role = 'creator'`
- `accountType = 'artist' | 'band'`
- `userType = accountType`
- `editorAccess = false`, salvo que un flujo administrativo posterior la cambie

## Restricción de correo cruzado

Un correo ya usado por una cuenta `fan` o `consumer` no puede reutilizarse como `artist` o `band`.

Un correo ya usado por `artist` o `band` no puede reutilizarse como `fan` o `consumer`.

## Flujo canónico

1. El usuario envía nombre, tipo de cuenta, país, género, correo, contraseña y aceptación legal.
2. El sistema valida campos requeridos y conflicto de identidad por correo.
3. El sistema crea el usuario creator.
4. El sistema intenta crear o enlazar su perfil creator.
5. El sistema genera y envía correo de verificación.
6. El usuario queda en estado `pending_verification`.
7. El login creator debe bloquearse mientras `_verified === false`.
8. Al abrir el enlace válido, la cuenta pasa a `verified`.
9. Después de verificar, el login creator debe funcionar.

## Reglas cerradas

1. La creación de usuario es la operación principal.
2. La sincronización del perfil es secundaria y no debe romper el alta si falla después de crear el usuario.
3. Un fallo posterior de perfil debe registrarse en logs y dejar la cuenta en estado recuperable.
4. El correo de verificación siempre debe construirse con el host real de la request actual.
5. Un deployment `Preview` debe enviar links de verify a ese mismo `Preview`.
6. `Production` debe enviar links de verify al dominio de producción.
7. El `GET` de la página de verify no debe consumir el token.
8. La confirmación real debe hacerse con una acción explícita `POST` o equivalente.
9. El endpoint o vista de verify debe ser idempotente desde UX.
10. Si la cuenta ya quedó verificada, no debe mostrarse un error genérico de token inválido.

## Mitigación de scanners

Muchos proveedores de correo, navegadores y sistemas de seguridad abren enlaces de verificación en segundo plano para escanearlos o generar preview.

Por eso:

- el link del correo puede abrir la página de verify
- pero no debe marcar la cuenta como verificada solo por recibir un `GET`
- la confirmación debe requerir una acción de aplicación que ocurra después de cargar la página
- si queremos conservar UX de “un click”, esa acción puede autoejecutarse en cliente tras la carga visible, pero no durante el render server del `GET`

## Estados canónicos

Estos estados deben existir a nivel de flujo aunque internamente algunos se resuelvan con los campos de Payload.

- `registration_rejected`
  El formulario no pudo crear la cuenta.
- `registration_created_pending_verification`
  La cuenta fue creada y espera confirmación de correo.
- `registration_created_profile_sync_degraded`
  La cuenta fue creada pero el sync de perfil falló; requiere recuperación interna, no mensaje de error fatal al usuario.
- `verification_completed`
  El token fue válido y la cuenta quedó verificada.
- `verification_already_completed`
  La cuenta ya estaba verificada cuando se abrió ese enlace o un enlace equivalente.
- `verification_token_invalid`
  El token no corresponde a un estado recuperable.
- `verification_token_expired`
  El token existió pero ya no debe aceptarse.
- `verification_resent`
  Se emitió un nuevo correo.
- `login_blocked_pending_verification`
  El login fue bloqueado porque la cuenta aún no confirma el correo.

## Mensajes UX obligatorios

## Registro exitoso

El registro exitoso debe comunicar:

- la cuenta fue creada
- el usuario debe revisar su correo
- no hubo login automático

No debe mostrar un error fatal si el usuario ya quedó en `pending_verification`.

## Verify exitoso

Si el token es válido y se consume correctamente:

- mostrar confirmación clara
- ofrecer CTA a login creator

## Verify ya resuelto

Si la cuenta ya está verificada:

- mostrar mensaje de éxito tardío o estado ya completado
- ofrecer CTA a login creator
- no mostrar `Verification token is invalid.`

Este punto es obligatorio porque hoy el flujo real parece seguir cayendo en error aun cuando la cuenta terminó utilizable.

## Verify inválido real

Solo debe mostrarse una variante de “enlace inválido” cuando:

- falta `email`
- falta `token`
- el token no existe
- el token pertenece a otro estado no recuperable

En ese caso sí puede mostrarse CTA para reenviar correo.

## Verify expirado

Si el token expiró:

- el mensaje debe decir que expiró
- se debe ofrecer reenvío
- no se debe reutilizar el copy de token inválido si podemos distinguirlo

## Reenvío

El reenvío debe:

- estar sujeto a cooldown
- invalidar el token anterior
- emitir un token nuevo
- dejar solo un token vigente por cuenta

## Contrato técnico del registro

## Entrada mínima

- `name`
- `accountType`
- `country`
- `genre`
- `email`
- `password`
- `acceptedLegal`

## Persistencia mínima tras alta exitosa

- documento `users` creado
- `role = 'creator'`
- `accountType = 'artist' | 'band'`
- `userType = accountType`
- `legalAccepted = true`
- `_verified = false`
- token de verificación vigente

## Perfil creator

El perfil creator debe crearse o enlazarse tras el alta.

Si este paso falla:

- no se debe revertir el usuario recién creado
- el error debe quedar en logs estructurados
- el sistema debe poder reintentar o reparar después

## Contrato técnico de correo

## Resolución de host

La URL de verify debe resolverse con esta prioridad:

1. `origin` de la request si existe
2. `x-forwarded-host` + `x-forwarded-proto`
3. `host`
4. fallback de servidor configurado

## Reglas

1. El mismo flujo server action y el mismo endpoint HTTP deben pasar la request real al generador del correo.
2. No se permite generar links absolutos de verify con dominio fijo cuando la request actual pertenece a otro deployment.
3. El correo reenviado debe usar la misma regla de host.

## Contrato técnico de verify

## Requisitos funcionales

1. Debe aceptar `email` y `token`.
2. Debe encontrar el usuario correcto por email.
3. Debe validar que el token corresponde a ese usuario.
4. Si el token es válido:
   - marcar cuenta verificada
   - invalidar token vigente
   - responder `verification_completed`
5. Si la cuenta ya está verificada:
   - responder `verification_already_completed`
   - no responder error fatal
6. Si existe un token viejo tras reenvío:
   - responder `verification_token_invalid` o `verification_token_expired`
   - ofrecer reenvío

## Idempotencia UX

La experiencia debe ser idempotente aunque el token no lo sea a nivel criptográfico.

Eso significa:

- primer click del enlace: éxito
- segundo click del mismo enlace, si la cuenta ya quedó verificada: éxito tardío, no error

## Casos que hoy deben quedar cubiertos

1. Registro nuevo en preview.
2. Correo generado desde preview con link al mismo preview.
3. Registro nuevo en producción con link a producción.
4. Doble click del mismo enlace tras verificación exitosa.
5. Reenvío de correo y uso del token nuevo.
6. Intento de usar token viejo después de reenviar.
7. Login antes de verificar.
8. Login después de verificar.
9. Fallo de sync de perfil sin romper el registro.
10. Error real de token inexistente.

## Matriz mínima de pruebas automatizadas

## Unit / integration

- registro `artist` exitoso
- registro `band` exitoso
- derivación correcta de `userType` desde `accountType`
- bloqueo por conflicto de correo con `fan`
- host dinámico de verify email con headers de preview
- host dinámico de verify email con host de producción
- alta que sobrevive a fallo de `ensureCreatorProfile`
- login bloqueado cuando `_verified === false`
- login permitido cuando `_verified === true`
- verify view con token válido
- verify view con token ya usado y cuenta verificada
- verify view con token inválido real
- reenvío con cooldown

## Smoke tests manuales obligatorios

### Preview

- registrar nueva banda o artista
- abrir correo real
- confirmar que el dominio del enlace coincide con el preview actual
- hacer click una primera vez
- hacer click una segunda vez
- verificar login exitoso posterior
- verificar que fan Google login siga funcionando en ese mismo deployment

### Production

- repetir el mismo flujo con cuenta de prueba real
- confirmar que el enlace usa dominio de producción
- confirmar que la segunda visita al enlace no cae en error genérico si la cuenta ya quedó verificada

## Criterios de aceptación

Este spec se considera cumplido cuando:

1. ningún registro exitoso vuelve a mostrar un error fatal por fallos secundarios de perfil
2. preview y producción generan enlaces con su propio host
3. la cuenta verificada no vuelve a mostrarse como `Verification token is invalid.` al reabrir un enlace ya consumido
4. login creator bloquea correctamente antes de verify y permite acceso después
5. las pruebas automatizadas e inspecciones manuales cubren el flujo completo

## Implementación recomendada

Orden recomendado de trabajo:

1. normalizar los estados del verify handler o view
2. distinguir `already verified` de `invalid token`
3. mantener el alta resiliente ante fallos de perfil
4. mantener host dinámico en registro y reenvío
5. agregar o ajustar pruebas antes de tocar más UX

## Nota abierta

El síntoma actual más importante no parece ser que el registro falle, sino que el verify posterior trata un estado ya resuelto como si fuera un error real.

La próxima implementación debe partir de esa hipótesis y validarla contra la lógica exacta de `verifyEmail`.
