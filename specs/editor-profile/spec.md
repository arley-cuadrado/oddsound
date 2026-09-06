# Spec: flujo de verificacion para editor

Fecha: 2026-08-28

## Objetivo

Hacer confiable el flujo completo de editor:

1. Admin crea editor desde `Users`.
2. Editor recibe correo de confirmacion.
3. Editor hace click en el enlace.
4. El token se valida correctamente.
5. El editor puede iniciar sesion sin ver `Verification token is invalid.`

## Problema actual

Hoy el flujo aparenta completarse parcialmente:

- La cuenta de editor se crea.
- El correo se envia.
- La pagina `/creator/verify` intenta validar el token.
- La validacion falla y muestra `Verification token is invalid.`

## Diagnostico actual

### Flujo detectado en el codigo

- La creacion de editor desde admin ocurre en [src/components/CreateRedactorButton/index.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/components/CreateRedactorButton/index.tsx).
- Ese formulario hace `POST /api/users` con `editorAccess: true`.
- La configuracion auth de `users` define `auth.verify` en [src/collections/Users/index.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Users/index.ts).
- La vista que consume el link del correo esta en [src/app/(frontend)/creator/verify/view.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/creator/verify/view.tsx).
- El reenvio manual esta en [src/app/(frontend)/creator/actions.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/creator/actions.ts).

### Hipotesis principal

El sistema mezcla dos mecanismos:

- El flujo nativo de verificacion de Payload al crear usuario.
- Un flujo manual de reenvio que escribe `_verificationToken` directamente.

Riesgo:

- `payload.verifyEmail()` puede depender de como Payload genera, guarda o normaliza internamente el token.
- Si el reenvio o la creacion editorial usan un formato distinto, el link llega bien construido pero el token no coincide con lo que `verifyEmail` espera.

## Requerimientos funcionales

### 1. Creacion de editor por admin

- Un admin puede crear un editor desde la vista filtrada de `Users`.
- La creacion no debe requerir `accountType`.
- La cuenta debe quedar como `role: creator` y `editorAccess: true`.
- El perfil editorial debe persistir `editorGender` y `editorSocials`.

### 2. Envio de correo de verificacion

- Todo editor nuevo debe recibir un correo de verificacion valido.
- El correo editorial debe seguir usando el template de editor.
- El link debe apuntar a `/creator/verify`.
- El link debe incluir `token` y `email`.

### 3. Confirmacion del enlace

- Cuando el editor abre el link, `payload.verifyEmail()` debe confirmar la cuenta sin error.
- Si el token es valido, la UI debe mostrar exito y CTA a `/creator/login`.
- Si el token es invalido o expiro, la UI debe ofrecer reenviar el correo.

### 4. Reenvio de correo

- El reenvio debe generar un token compatible con `payload.verifyEmail()`.
- El reenvio no debe depender de escribir campos internos de auth manualmente si Payload ofrece una API nativa para esto.
- El reenvio debe conservar cooldown para evitar abuso.

### 5. Inicio de sesion posterior

- Un editor verificado puede iniciar sesion normalmente.
- Un editor no verificado debe seguir bloqueado hasta confirmar el correo.

## Requerimientos tecnicos

### Fuente unica de verdad

- El proyecto debe usar un solo mecanismo oficial para generar y validar tokens de verificacion.
- Debemos evitar mantener logica paralela para `_verificationToken` si eso se desvincula del comportamiento interno de Payload.

### Compatibilidad editorial

- El flujo de editor no debe romper el flujo actual de creador normal.
- El template editorial y el template de creator pueden seguir separados, pero la generacion del token debe ser compartida y consistente.

### Observabilidad minima

- Si la verificacion falla, debemos poder distinguir entre:
  - token ausente
  - token expirado
  - token no encontrado
  - cuenta ya verificada

## Propuesta de implementacion

### Fase 1. Auditar y unificar token de verificacion

- Revisar si `POST /api/users` ya dispara correctamente el flujo verify nativo para cuentas editoriales.
- Reemplazar la generacion manual de `_verificationToken` en `resendVerificationEmail()` por una llamada soportada por Payload o por el mismo flujo interno que usa la creacion original.
- No depender de asignar `_verificationToken` por `payload.update()` salvo que Payload documente expresamente ese camino.

### Fase 2. Endurecer la vista de verificacion

- Mantener `payload.verifyEmail()` como punto final de validacion.
- Mejorar el manejo de mensajes para no mostrar solo el error crudo cuando sea recuperable.
- Conservar el formulario de reenvio cuando exista `email`.

### Fase 3. Cubrir el flujo editorial con pruebas

- Agregar prueba para editor creado por admin con correo/template editorial.
- Agregar prueba para verificacion exitosa de editor.
- Agregar prueba para reenvio editorial usando el mecanismo unificado.
- Agregar prueba que garantice que un token reenviado si puede validarse luego en `/creator/verify`.

## Criterios de aceptacion

- Crear un editor desde admin envia un enlace funcional.
- El primer click en el enlace confirma la cuenta.
- La ruta `/creator/verify` no muestra `Verification token is invalid.` para tokens recien emitidos.
- El reenvio genera un segundo enlace tambien funcional.
- El editor ya verificado puede iniciar sesion.
- El flujo de creator no editorial sigue funcionando igual.

## Casos de prueba sugeridos

1. Crear editor desde admin y verificar que se envia correo editorial.
2. Abrir el enlace recibido y verificar que la cuenta queda `_verified: true`.
3. Intentar login antes de verificar y confirmar bloqueo.
4. Reenviar correo a editor pendiente y validar el nuevo enlace.
5. Confirmar que `accountType` sigue oculto para editor.

## Fuera de alcance en este spec

- Rediseño visual del formulario de editor.
- Cambios de copy amplios en correos o auth.
- Firma editorial en posts.
- Permisos avanzados de edicion de perfil fuera del flujo de autenticacion/verificacion.

## Nota de implementacion

La sospecha tecnica mas fuerte hoy esta en [src/app/(frontend)/creator/actions.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/creator/actions.ts), donde el reenvio manual actualiza `_verificationToken` directamente. Ese punto debe validarse primero porque puede producir enlaces incompatibles con `payload.verifyEmail()`.
