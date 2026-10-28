# Preview aislado y datos de prueba

La rama `codex/shop-operations` utiliza `oddsound_preview_shop_operations`.
Payload crea sus colecciones e índices con la misma configuración de la aplicación;
no se exportan documentos, usuarios, pedidos ni credenciales de producción.

## Permisos de MongoDB: paso obligatorio

Una base distinta en el mismo clúster no impide que una credencial con `atlasAdmin`
acceda a producción. En Atlas, crear un usuario exclusivo con rol `readWrite`
únicamente sobre `oddsound_preview_shop_operations`, sin roles globales ni acceso a
otras bases. Preferir un proyecto/clúster separado si se necesita aislamiento de
infraestructura, además de permisos.

En Vercel, sustituir `DATABASE_URL` únicamente en Preview, rama
`codex/shop-operations`, por la URI de ese usuario. Definir también
`PREVIEW_DATABASE_USER` con su nombre. No modificar el registro compartido con
Production ni introducir contraseñas en Git o en el chat. Verificar los permisos
efectivos del nuevo usuario antes de considerar completado el aislamiento.

## Variables de la rama Preview

- `PREVIEW_DATABASE_NAME=oddsound_preview_shop_operations`: obligatorio. La
  aplicación falla antes de conectar si la URI apunta a otra base o falta esta
  declaración. Otras ramas Preview también necesitan su configuración explícita.
- `PAYLOAD_SECRET` y `MARKETPLACE_TOKEN_ENCRYPTION_KEY`: valores exclusivos de
  Preview, distintos de producción.
- `NEXT_PUBLIC_SERVER_URL`: alias Preview de esta rama.
- `WOMPI_ENVIRONMENT=sandbox` y `PREVIEW_ALLOW_SANDBOX_CHECKOUT=false`.
- `SHOPPING_ENABLED=true`: mantiene visibles las pantallas públicas. Los cobros
  siguen deshabilitados por las protecciones adicionales y la configuración de
  comercio.
- `PREVIEW_BLOB_READ_WRITE_TOKEN`: opcional, debe pertenecer a un almacén de
  pruebas. No se reutiliza `BLOB_READ_WRITE_TOKEN` en Preview. Sin este almacén,
  las imágenes incluidas funcionan, pero las subidas nuevas en Vercel requieren
  completar esta configuración.

La rama `codex/shop-operations` tiene configurado un secreto sensible exclusivo
para el almacén público `oddsound-preview-shop-operations`
(`store_qeHEwoZGepXpzxBZ`, región `iad1`). No se conecta el almacén a Production ni
se distribuye su token a otras ramas. Las imágenes subidas aquí son públicas;
utilizar únicamente imágenes de prueba, nunca documentos privados.

Preview deshabilita SMTP y todas las llamadas a la API de dispersiones bancarias.
El catálogo de bancos es ficticio. El acceso a Wompi productivo también se rechaza.
Los conectores de transportadoras permanecen deshabilitados.

## Inicialización y seed

Cargar las variables **exclusivas de Preview** en el proceso local y ejecutar:

```sh
pnpm commerce:init
pnpm seed:preview
```

El segundo comando exige `VERCEL_ENV=preview`, el nombre explícito de la base y
`PREVIEW_DEMO_PASSWORD` de al menos 20 caracteres. Esta contraseña solo es necesaria
para el proceso de seed; no debe almacenarse en Vercel ni versionarse.

El seed es repetible: identifica cuentas, perfiles y productos por email/slug y
operaciones por referencia única. No borra datos. Las cuentas ya existentes no
cambian de contraseña. Reejecutarlo restablece los productos demo y desactiva
cobros, reembolsos y dispersiones, incluso de Sandbox.

Incluye administración, banda, artista y fan; dos tiendas, cuatro productos,
pedidos con distintos saldos, guías ficticias, conversaciones, un reclamo y una
reseña verificada simulada. Las cuentas bancarias demo no están verificadas.
Los asientos identificados como `preview_demo` usan fondos sintéticos, nunca
recaudos reales. No se generan tareas externas de seguimiento o pago.

Los accesos se entregan en un archivo local privado, fuera de Git. Entrar a
`/dashboard` como banda/artista para Productos y a `/fan/account` como fan.
Las tiendas de ejemplo son `/horizonte-demo/shop` y `/luna-demo/shop`.

Un despliegue Preview correcto y una URI con nombre distinto no prueban por sí
solos que producción esté protegida: deben verificarse también los permisos de
Atlas y los almacenes externos independientes.
