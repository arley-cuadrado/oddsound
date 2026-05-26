# Vercel: Preview + Production

Este proyecto no necesita un entorno `staging` dedicado todavía. El flujo recomendado es:

- `localhost` para desarrollo diario
- `Preview` de Vercel para pruebas compartibles
- `Production` para el sitio en vivo

## Ramas

- `main`: producción
- cualquier otra rama: preview automático en Vercel

Si quieres una preview más estable para revisión interna, puedes usar una rama como `release` o `qa`, pero seguirá siendo `Preview`, no un `staging` separado.

## Entornos en Vercel

### Preview

Usar para:

- revisar UX
- probar auth
- validar correos con cuentas de prueba
- compartir cambios por URL sin tocar producción

### Production

Usar solo cuando:

- el flujo crítico fue validado en localhost y preview
- los correos se ven bien
- el login y registro funcionan
- el contenido o cambios están listos para usuarios reales

## Variables necesarias

Este proyecto usa actualmente estas variables para desplegar correctamente:

- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `NEXT_PUBLIC_SERVER_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`
- `CRON_SECRET`
- `PREVIEW_SECRET`
- `SUPER_ADMIN_EMAILS` opcional, separada por comas

## Resolución de URL pública

La app ahora resuelve la URL pública en este orden:

1. `NEXT_PUBLIC_SERVER_URL`
2. `VERCEL_URL`
3. `VERCEL_BRANCH_URL`
4. `VERCEL_PROJECT_PRODUCTION_URL`
5. `http://localhost:3000`

Esto reduce fricción en Vercel porque:

- `Preview` puede funcionar sin apuntar por error al dominio de producción
- emails, sitemaps y metadata usan la URL del deployment actual si no definiste una explícita
- `Production` sigue pudiendo fijarse manualmente con `NEXT_PUBLIC_SERVER_URL`

## SMTP en builds

La app ahora evita verificar el transporte SMTP durante builds locales y `Preview`.

Eso ayuda a que:

- una preview no falle por DNS o reachability temporal del proveedor SMTP
- `next build` no dependa de conectividad saliente para compilar
- la verificación fuerte quede reservada para `Production` en Vercel

## Valores por entorno

### Preview

- `NEXT_PUBLIC_SERVER_URL`: URL preview pública de Vercel o dominio preview que vayas a usar
- `DATABASE_URL`: idealmente una base separada de producción
- `SMTP_*`: puede usar Resend, pero prueba con cuentas de correo controladas
- `EMAIL_FROM_ADDRESS`: remitente válido del dominio verificado en Resend
- `SUPER_ADMIN_EMAILS`: lista de cuentas admin que no deben depender de un hardcode local

### Production

- `NEXT_PUBLIC_SERVER_URL`: dominio final, por ejemplo `https://oddsound.co`
- `DATABASE_URL`: base real de producción
- `SMTP_*`: credenciales definitivas
- `EMAIL_FROM_ADDRESS`: remitente final
- `SUPER_ADMIN_EMAILS`: lista final de superadministradores

## Recomendación de base de datos

Aunque no creemos `staging`, sí conviene:

- `preview`: una base de datos de pruebas
- `production`: una base de datos real

Eso evita contaminar producción con:

- cuentas de prueba
- envíos de correo de QA
- contenido temporal

## Flujo recomendado

1. Trabajar en local con `pnpm dev`
2. Crear una rama nueva
3. Subir la rama a GitHub
4. Dejar que Vercel genere la preview
5. Probar:
   - registro creator
   - verificación por correo
   - recuperación de contraseña
   - login creator
   - dashboard/admin
6. Si todo está bien, hacer merge a `main`
7. Vercel despliega a producción

## Checklist antes de merge a producción

- `pnpm exec tsc --noEmit`
- revisar preview de emails en `/dev/email-preview`
- probar correo de confirmación real
- probar correo de reset real
- validar que `NEXT_PUBLIC_SERVER_URL` del entorno correcto coincida con la URL pública
- revisar que el dominio de Resend siga verificado

## Checklist técnico Vercel

### Preview

- confirmar que `NEXT_PUBLIC_SERVER_URL` apunte al deployment preview o dejar que Vercel resuelva `VERCEL_URL`
- usar base de datos separada de producción
- verificar registro creator
- verificar login creator
- verificar correo de verificación
- verificar reset de contraseña
- verificar `/next/preview` con `PREVIEW_SECRET`
- verificar que imágenes y media carguen desde `/media` o Blob sin enlaces rotos
- verificar que sitemap y metadata salgan con el host preview correcto

### Production

- confirmar `NEXT_PUBLIC_SERVER_URL` con el dominio final
- definir `SUPER_ADMIN_EMAILS`
- confirmar `CRON_SECRET` y `PREVIEW_SECRET`
- confirmar credenciales SMTP reales
- confirmar dominio remitente verificado
- validar acceso a `/dashboard`
- validar logout creator y admin
- validar una publicación real y su revalidación

## Si `next build` queda bloqueado localmente

- revisar si quedó `.next/lock` de una compilación anterior
- borrar o mover ese lock antes de reintentar
- si hay SMTP configurado, recordar que la app sólo fuerza verificación del transporte en `Production` de Vercel

## Comandos útiles

```bash
pnpm dev
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

## Notas para este repo

- El admin vive en `/dashboard`
- El auth de creator vive separado del shell público
- Los emails dependen de `NEXT_PUBLIC_SERVER_URL` para construir links absolutos
- Resend se usa vía SMTP desde Payload

## Cuándo sí crear un staging real

Vale la pena recién cuando ocurra alguna de estas:

- varias personas prueban al mismo tiempo
- necesitas QA persistente antes de producción
- quieres una URL fija tipo `staging.oddsound.co`
- necesitas procesos de aprobación antes de publicar
