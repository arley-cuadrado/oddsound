## 📋 Business Requirements & Features

### 1. Objetivo del Perfil de Editor

**Se creará un módulo de perfil para usuarios tipo editor dentro de Oddsound.**

- El perfil debe permitir que cada editor vea y actualice su propia información personal sin exponer controles administrativos.
- El módulo debe funcionar como una extensión nativa del admin de Payload, respetando la estructura visual y de permisos ya definida en el proyecto.
- El admin mantiene visibilidad total sobre los perfiles de editores cuando sea necesario para soporte o moderación.

---

### 2. Acceso y Alcance

**Cada editor solo podrá acceder a su propio perfil.**

- Un editor puede abrir, revisar y editar únicamente su información personal.
- Un editor no puede acceder ni editar el perfil de otros editores.
- El admin puede ver y editar cualquier perfil de editor.

**El perfil del editor debe convivir con los accesos ya definidos para redactores:**

- `Posts`
- `Profiles`
- `Media`

---

### 3. Campos Editables por el Editor

**Campos que el editor SÍ puede modificar:**

- Nombre completo
- Nombre de usuario
- Contraseña
- Avatar o imagen de perfil
- Género con opciones controladas: `Hombre`, `Mujer` o `Indeterminado`
- Información biográfica o descriptiva del perfil
- Campo de Instagram
- Campo de X
- Campo de Threads
- Campo de Facebook
- Enlaces públicos del perfil, si existen en la colección correspondiente

**Campos que el editor NO puede modificar:**

- Rol
- Tipo de cuenta
- Estado de activación
- Permisos administrativos
- Relaciones o configuraciones reservadas al admin
- `Account Type` y cualquier selector asociado a esa categoría

---

### 4. Reglas de Negocio

- Todo cambio realizado por el editor debe persistirse únicamente sobre su propio registro.
- El sistema no debe permitir escalación de privilegios desde el perfil.
- Si existe un campo que afecta permisos, publicación o visibilidad administrativa, ese campo debe permanecer oculto o bloqueado para editores.
- El perfil debe seguir siendo editable aunque el editor no tenga acceso al resto de colecciones administrativas.
- Cualquier validación requerida en nombre, username, email o avatar debe respetar las reglas ya existentes del proyecto.
- Los campos de redes sociales del perfil deben estar definidos como inputs claros y etiquetados dentro del perfil del editor para que luego puedan reutilizarse en el frontend del artículo.
- La información social cargada en el perfil debe servir como fuente única para los enlaces públicos mostrados en artículos escritos por ese editor.
- El campo de género debe usarse únicamente para resolver correctamente el subtítulo editorial visible en el frontend.
- Los perfiles de editor pertenecen a una categoría separada de los perfiles artísticos o de banda, por lo que no deben exponer controles de clasificación pensados para esos otros perfiles.

---

### 5. Reglas para `Account Type`

**El campo `Account Type` no debe formar parte del flujo de perfiles editoriales.**

- El label `Account Type` no debe mostrarse dentro del perfil de un editor.
- El input, dropdown o selector asociado a `Account Type` no debe mostrarse dentro del perfil de un editor.
- El admin tampoco debe ver `Account Type` al momento de crear un nuevo editor.
- El admin tampoco debe necesitar seleccionar categorías como artista, banda u otras equivalentes para completar la creación de un editor.
- Si internamente existe una clasificación técnica para estos perfiles, esta debe resolverse por configuración del sistema y no mediante una elección manual visible en el formulario editorial.

---

### 6. Firma Editorial en el Pie del Artículo

**Cada artículo escrito por un editor debe mostrar una firma editorial en su pie de página.**

La firma debe incluir:

- Foto o avatar del editor
- Nombre del editor
- Subtítulo editorial dinámico
- Enlaces a redes sociales disponibles

**Redes sociales contempladas para esta firma:**

- Instagram
- X
- Threads
- Facebook

**Regla para el subtítulo editorial:**

- Si el perfil indica `Hombre`, el subtítulo visible será `Editor`.
- Si el perfil indica `Mujer`, el subtítulo visible será `Editora`.
- Si el perfil indica `Indeterminado`, el subtítulo visible será `Equipo editorial`.

**Regla de renderizado:**

- Solo deben mostrarse las redes sociales que realmente tengan un valor cargado en el perfil del editor.
- La firma editorial debe tomar estos datos directamente del perfil vinculado al autor del artículo.
- El bloque no debe depender de contenido manual cargado por artículo si la información ya existe en el perfil del editor.

---

### 7. Requisitos de Interfaz

- La interfaz debe usar los componentes y estilos base de Payload.
- No se deben agregar tarjetas decorativas, sombras, gradientes ni variantes visuales nuevas para este módulo.
- La edición del perfil debe priorizar campos claros, flujo vertical simple y acciones nativas de guardar/cancelar.
- Si se muestran mensajes de estado, deben resolverse con el lenguaje visual existente del admin.
- El formulario de editor debe excluir por completo controles que pertenezcan a categorías de perfil no editoriales, especialmente `Account Type`.

---

### 8. Criterios de Aceptación

- Un editor autenticado puede abrir su perfil y editar sus datos permitidos.
- Un editor autenticado no puede cambiar su rol, tipo de cuenta ni estado de activación.
- Un editor no puede editar perfiles ajenos mediante la UI ni mediante acceso directo por URL.
- El admin conserva control total sobre los perfiles de editor.
- El módulo mantiene consistencia visual con el resto del admin de Payload y Oddsound.
- El perfil del editor permite cargar avatar, género y enlaces sociales reutilizables.
- El pie de cada artículo escrito por un editor muestra avatar, nombre y subtítulo editorial según el género configurado.
- El pie del artículo solo muestra enlaces de redes sociales que existan realmente en el perfil del editor.
- Ni el editor ni el admin ven el campo `Account Type` dentro del flujo de perfil o creación de editores.
- La creación de un editor no requiere seleccionar categorías como artista o banda.
