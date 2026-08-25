# Oddsound Fan Identity Security Spec

Fecha de referencia: August 23, 2026.

## Objetivo

Definir las restricciones funcionales y de seguridad del tipo de usuario `fan` dentro de Oddsound.

## Reglas cerradas

1. `fan` no es artista, banda, redactor ni admin.
2. `fan` no accede al admin de Payload ni al dashboard interno.
3. `fan` no puede ver ni crear:
   - lanzamientos
   - biografías
   - perfiles musicales
   - imágenes
   - productos
   - publicaciones programadas
   - carritos del plugin ecommerce
4. `fan` sí puede:
   - registrarse con Google
   - iniciar sesión
   - comentar lanzamientos públicos
   - consultar compras asociadas a Mercado Pago
   - consultar tracking y estado de pedidos
5. El acceso de `fan` se resuelve en frontend autenticado con rutas `fan/*`.

## Rutas públicas obligatorias

- `/fan/login`
- `/fan/register`
- `/fan/account`

## Restricción técnica obligatoria

Las limitaciones de `fan` deben existir en:

1. access control de Payload
2. visibilidad del admin/dashboard
3. rutas frontend autenticadas
4. pruebas automatizadas de seguridad

No es válido resolver este aislamiento solo con ocultamiento visual.
