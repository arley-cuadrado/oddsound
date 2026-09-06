## Fan Account Spec

Fecha de referencia: August 25, 2026.

### Objetivo

La cuenta de fan debe concentrarse exclusivamente en la participación editorial del usuario dentro de Oddsound a través de sus comentarios en lanzamientos.

### Reglas de interfaz

- El encabezado de `/fan/account` debe mostrar únicamente el mensaje: `Aquí puedes ver tus comentarios.`
- La sección `Mis comentarios` debe mantenerse visible como bloque principal de la cuenta.
- Las secciones `Mis compras` y `Tracking y estado` no deben renderizarse en la cuenta de fan.
- La cuenta de fan no debe mostrar textos que sugieran acceso a compras, órdenes o fulfillment mientras ese alcance no forme parte del producto fan.

### Reglas de comentarios

- La sección `Mis comentarios` debe mostrar el texto: `Historial de comentarios hechos sobre lanzamientos dentro de Oddsound.`
- Los comentarios hechos por fans autenticados con Google deben publicarse inmediatamente.
- En esta versión no debe existir moderación previa para comentarios fan autenticados con Google.
- La moderación de comentarios fan se considera una capacidad de segunda versión de la plataforma.
- Si el usuario fan no ha comentado aún, debe mostrarse el estado vacío: `Aún no has comentado ningún lanzamiento.`
- Si el usuario fan ya tiene comentarios, el estado vacío debe desaparecer y reemplazarse por el historial real.
- Cada entrada del historial debe enlazar al lanzamiento asociado.
- El enlace de cada entrada debe apuntar al comentario específico dentro del detalle del release, no solo a la página general del lanzamiento.

### Criterios de aceptación

- `/fan/account` renderiza solo el encabezado y la sección `Mis comentarios`.
- No se renderizan bloques de compras ni tracking en la cuenta de fan.
- Un comentario enviado por un fan autenticado con Google queda publicado de inmediato.
- Un comentario existente en el historial redirige al release correspondiente con un ancla al comentario.
- Un fan sin comentarios ve únicamente el estado vacío de comentarios.
