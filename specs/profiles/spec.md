## 📋 Business Requirements & Features

### 1. Objetivo del Módulo de Profiles

**La colección `Profiles` debe soportar tipos de perfil claramente diferenciados dentro de Oddsound.**

- Un perfil editorial no puede modelarse como si fuera un perfil de artista o banda.
- Un perfil artístico no puede reutilizar reglas de edición propias del perfil editorial.
- La arquitectura de `Profiles` debe reflejar esta separación tanto en datos como en interfaz y permisos.

---

### 2. Tipos de Perfil

**El sistema debe reconocer al menos dos familias de perfil:**

- `Artist/Band Profile`
- `Editorial Profile`

**Regla estructural:**

- Un `Editorial Profile` no debe derivarse visual ni funcionalmente de `artist` o `band`.
- Un `Editorial Profile` debe identificarse como una categoría propia dentro del sistema.
- Si internamente existe un campo técnico de discriminación, este debe permitir distinguir perfiles editoriales de perfiles musicales sin ambigüedad.

---

### 3. Separación de Modelo de Datos

**Los perfiles editoriales y los perfiles musicales no deben compartir el mismo contrato editable.**

#### Campos propios de perfiles musicales

Estos campos pertenecen a perfiles de artista o banda y no deben aparecer en perfiles editoriales:

- `Account Type`
- Género musical
- Ciudad, país o metadata pensada para discovery musical, salvo que exista una razón editorial explícita
- Campos de commerce, releases o identidad artística que no correspondan a redactores

#### Campos propios de perfiles editoriales

Estos campos sí pertenecen a perfiles de editores:

- Nombre visible
- Avatar
- Biografía editorial o descripción breve
- Género editorial para subtítulo (`Hombre`, `Mujer`, `Indeterminado`)
- Redes sociales editoriales:
  - Instagram
  - X
  - Threads
  - Facebook

---

### 4. Reglas para Perfil Editorial

- Crear un editor debe generar un perfil editorial, no un perfil de artista.
- El perfil editorial no debe guardar `accountType` con valores como `artist` o `band`.
- El perfil editorial no debe heredar defaults pensados para onboarding musical.
- El perfil editorial debe excluir cualquier campo cuya semántica pertenezca a una cuenta artística.
- El perfil editorial debe poder evolucionar con campos propios sin arrastrar deuda de la estructura musical.

---

### 5. Reglas para Perfil de Artista o Banda

- Los perfiles de artista o banda deben conservar sus campos específicos de identidad musical.
- Los perfiles musicales no deben mostrar ni almacenar campos editoriales que solo tengan sentido para redactores.
- La lógica pública de biografía, releases, shop y discovery debe seguir usando únicamente perfiles musicales.

---

### 6. Reglas de Admin y Creación

- Cuando el admin crea un nuevo editor, el sistema debe crear automáticamente un perfil editorial asociado.
- Cuando el admin crea o edita artistas o bandas, debe seguir usando el flujo musical ya existente.
- El admin no debe tener que corregir manualmente un perfil editorial que haya sido creado como `artist`.
- Si el sistema detecta un usuario editorial con perfil musical heredado por error, debe existir una estrategia de normalización o migración.

---

### 7. Reglas de Interfaz

- La UI del perfil debe cambiar según el tipo de perfil que se esté editando.
- Un editor no debe ver labels, dropdowns o inputs pensados para artista o banda.
- Un artista o banda no debe ver campos de subtítulo editorial ni redes sociales del bloque de autor de posts.
- La separación de UI debe ser clara y no depender únicamente de ocultar un solo campo; debe responder al tipo real de perfil.

---

### 8. Reglas de Integración con Posts

- Los `posts` escritos por redactores deben resolver su información de autor desde `Editorial Profile`.
- La firma al pie del artículo no debe consultar campos de perfil artístico.
- El nombre, avatar, subtítulo y redes sociales del autor editorial deben salir del perfil editorial asociado.

---

### 9. Criterios de Aceptación

- Crear un editor desde admin produce un perfil editorial y no un perfil `artist` o `band`.
- Un perfil editorial no muestra `Account Type` ni otros campos musicales.
- Un perfil editorial no persiste `accountType` como valor de artista o banda.
- Un perfil musical conserva su estructura actual sin contaminarse con campos editoriales.
- El frontend de artículos usa información del perfil editorial correcto.
- La colección `Profiles` queda documentada con una separación explícita entre perfiles musicales y editoriales.
