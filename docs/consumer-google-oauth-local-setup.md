# Consumer Google OAuth Local Setup

Fecha de referencia: August 23, 2026.

## Variables requeridas

Configura estas variables en tu `.env.local` o `.env` para habilitar el registro e inicio de sesión `consumer` con Google:

```env
GOOGLE_OAUTH_CLIENT_ID=google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=google_oauth_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/consumer-api/auth/google/callback
```

## Redirect URI local

En Google Cloud Console, el redirect URI autorizado para local debe incluir exactamente:

```text
http://localhost:3000/consumer-api/auth/google/callback
```

Si cambias el puerto local o el dominio del entorno, debes actualizar también `GOOGLE_OAUTH_REDIRECT_URI` y el valor autorizado en Google.

## Reglas del flujo `consumer`

1. `consumer` usa Google como método principal de acceso.
2. Si falta la configuración OAuth, `consumer/register` y `consumer/login` muestran el acceso deshabilitado en vez de iniciar un callback roto.
3. Si el correo ya existe como artista o banda, no puede reutilizarse como `consumer`.
4. Si el correo ya existe como `consumer`, no puede reutilizarse como artista o banda.

## Validación local recomendada

1. Levanta el proyecto con `pnpm dev`.
2. Abre `/consumer/register`.
3. Confirma que el botón de Google esté habilitado.
4. Verifica que el callback vuelva a `/consumer/account` después del acceso.
