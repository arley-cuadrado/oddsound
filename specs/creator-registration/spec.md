# Spec: registro confiable de artista y banda

Fecha: 2026-08-30

## Objetivo

Definir el flujo canonico de registro para cuentas de artista y banda en Oddsound, de forma que:

1. la cuenta se cree correctamente
2. el perfil asociado quede consistente
3. el correo de verificacion sea valido
4. el enlace de verificacion funcione tanto en preview como en produccion
5. el login posterior no falle por desalineaciones entre usuario, perfil, token o dominio

## Problemas descubiertos hasta ahora

Durante la implementacion actual aparecieron varios fallos reales que este spec debe prevenir de forma explicita:

- el registro mostraba `Cannot read properties of null (reading 'label')` aunque el correo alcanzaba a salir
- el correo de verificacion podia enviarse antes de que la creacion del usuario quedara consolidada
- el enlace del correo podia apuntar a un dominio distinto al origen real del registro
- `preview` y `production` podian mezclar hosts en el flujo de verificacion
- el token podia resultar invalido porque el usuario no habia quedado persistido realmente
- el login fan con Google perdia el `state` por saltos entre hosts

Este spec toma esos incidentes como regresiones conocidas que no pueden volver a aparecer.

## Alcance

Este spec cubre:

- registro de artista
- registro de banda
- persistencia del usuario en `users`
- persistencia del perfil en `profiles`
- generacion y envio del correo de verificacion
- validacion del enlace en `/creator/verify`
- reenvio de verificacion
- compatibilidad entre preview y production

Este spec no cubre:

- login fan con Google como flujo principal
- invitaciones de editor
- rediseño visual del formulario
- cambios editoriales de copy fuera de este flujo

## Flujo funcional esperado

### 1. Alta desde formulario publico

La cuenta de artista o banda se crea desde:

- `/creator/register`

El formulario debe recolectar:

- `name`
- `accountType`
- `country`
- `genre`
- `email`
- `password`
- `acceptedLegal`

Todos son obligatorios.

### 2. Validaciones previas

Antes de crear el usuario, el sistema debe validar:

- `acceptedLegal` debe ser `true`
- `name`, `country`, `genre`, `email` y `password` deben existir
- `email` debe normalizarse a lowercase
- `password` debe cumplir la regla minima activa del sistema
- no puede existir conflicto con una cuenta fan basada en Google
- si ya existe una cuenta musical verificada con ese correo, el registro debe bloquearse
- si ya existe una cuenta musical pendiente de verificacion con ese correo, no debe duplicarse; debe responder como cuenta pendiente

### 3. Creacion de usuario

Cuando la validacion previa pasa, el sistema debe crear un documento en `users` con:

- `role: 'creator'`
- `userType: 'artist'` o `userType: 'band'`
- `accountType: 'artist'` o `accountType: 'band'`
- `editorAccess: false`
- `isActive: true`
- `legalAccepted: true`
- `legalAcceptedAt`
- `legalAcceptedVersion`
- `username` normalizado y unico

### 4. Creacion y sincronizacion del perfil

Despues de crear el usuario, el sistema debe garantizar un `profile` asociado.

El perfil debe:

- pertenecer al `owner` correcto
- conservar `profileType` consistente con `artist` o `band`
- guardar `location` con el `country`
- guardar `genre`
- enlazarse de vuelta al `user.profile`

Si la sincronizacion del perfil falla despues de crear el usuario, el sistema no debe revertir la cuenta ya creada por ese motivo.

### 5. Verificacion por correo

El correo de verificacion solo debe enviarse despues de que:

- el usuario exista realmente
- el token haya quedado persistido
- la cuenta este en estado pendiente de verificacion

El correo debe:

- usar el template de creador normal
- apuntar a `/creator/verify`
- incluir `email` y `token`
- usar el host real del request que origino el registro

### 6. Confirmacion del enlace

Cuando el usuario abre el enlace:

- `/creator/verify` debe validar el token con `payload.verifyEmail()`
- si el token es valido, la cuenta debe quedar verificada
- la UI debe mostrar exito y CTA a login
- si la cuenta ya estaba verificada, debe mostrarse un mensaje de estado recuperable
- si el token es invalido o expiro, debe ofrecerse reenvio

### 7. Reenvio de verificacion

El reenvio debe:

- buscar la cuenta pendiente por `email`
- generar un token nuevo
- persistir ese token antes del envio
- usar el mismo host activo del request
- no depender de una URL fija de produccion si el flujo sucede en preview

### 8. Inicio de sesion posterior

Despues de verificar el correo:

- artista y banda deben poder iniciar sesion normalmente
- antes de verificar, el login debe bloquearse con mensaje claro de correo pendiente

## Reglas tecnicas obligatorias

### Fuente de verdad del host

Todo flujo de verificacion debe usar el host actual del request cuando:

- se genera el correo inicial
- se reenvia el correo
- se hace callback o redirect entre pantallas del mismo flujo

No se debe forzar produccion cuando el flujo se origina en preview.

### Orden correcto del correo

El sistema no debe enviar el correo de verificacion antes de consolidar:

- usuario
- token
- estado pendiente

Si el orden interno del framework no garantiza eso, el proyecto debe controlar el envio manualmente al final del flujo.

### Tolerancia a fallos secundarios

Errores secundarios como:

- sincronizacion del perfil
- actualizacion decorativa posterior
- lecturas complementarias

no deben invalidar el alta principal si la cuenta del usuario ya fue creada.

### No mezclar entornos

Un registro iniciado en:

- preview
- production
- localhost

debe completarse en ese mismo origen salvo que exista una decision explicita de negocio para centralizarlo.

## Estados de respuesta esperados

### Registro exitoso

Respuesta esperada:

- `ok: true`
- `status: 'pending_verification'`
- `email` normalizado
- mensaje indicando revisar el correo

### Registro duplicado verificado

Respuesta esperada:

- `ok: false`
- mensaje de usuario ya registrado

### Registro duplicado pendiente

Respuesta esperada:

- `ok: true`
- `status: 'pending_verification'`
- mensaje de cuenta pendiente

### Conflicto con fan Google

Respuesta esperada:

- `ok: false`
- mensaje de conflicto entre tipos de cuenta

## Criterios de aceptacion

1. Un artista nuevo puede registrarse y recibe un correo valido.
2. Una banda nueva puede registrarse y recibe un correo valido.
3. El correo enviado desde preview contiene un enlace de preview.
4. El correo enviado desde produccion contiene un enlace de produccion.
5. El enlace confirma la cuenta en el primer click cuando el token es recien emitido.
6. El reenvio genera un segundo enlace valido.
7. Un fallo de sincronizacion de perfil no rompe la creacion principal de la cuenta.
8. El login bloquea cuentas no verificadas y permite cuentas verificadas.
9. El mismo correo no puede crear una cuenta musical duplicada si ya existe una cuenta pendiente o verificada.
10. El registro no muestra errores internos de Payload o de UI como `Cannot read properties of null (reading 'label')`.

## Casos de prueba minimos

1. Registro exitoso de artista con correo de verificacion valido.
2. Registro exitoso de banda con correo de verificacion valido.
3. Registro en preview y click en enlace dentro de preview.
4. Registro en produccion y click en enlace dentro de produccion.
5. Reenvio de correo para cuenta pendiente.
6. Login rechazado antes de verificar.
7. Login exitoso despues de verificar.
8. Registro con correo ya usado por fan Google.
9. Registro con error de sincronizacion de perfil y confirmacion de que la cuenta principal sigue existiendo.
10. Validacion de que el token se persiste antes de enviar el correo.

## Archivos relevantes

- [src/app/(frontend)/creator/register/register-form.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/creator/register/register-form.tsx)
- [src/app/(frontend)/creator/actions.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/creator/actions.ts)
- [src/utilities/creatorAuth.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/utilities/creatorAuth.ts)
- [src/utilities/emailVerification.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/utilities/emailVerification.ts)
- [src/app/(frontend)/creator/verify/view.tsx](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/app/(frontend)/creator/verify/view.tsx)
- [src/collections/Users/hooks/createProfile.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Users/hooks/createProfile.ts)
- [src/collections/Users/hooks/ensureCreatorDefaults.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/collections/Users/hooks/ensureCreatorDefaults.ts)
- [src/utilities/creatorProfiles.ts](/Users/arlo_cuadrado/Documents/dev/strapi_projects/hearMeOutProject/ODDSOUND_PROJECT/oddsound/src/utilities/creatorProfiles.ts)

## Nota de implementacion

La principal leccion de este flujo es que el correo no debe considerarse prueba de exito del registro.

La prueba real de exito es:

- usuario persistido
- token persistido
- perfil enlazado o recuperable
- host correcto
- enlace verificable

Si cualquiera de esos puntos no esta garantizado, el sistema puede parecer funcional y aun asi fallar en el paso mas sensible: la activacion real de la cuenta.
