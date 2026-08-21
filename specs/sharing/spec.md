## 📋 Business Requirements & Features

### 1. Crear Artículos y Usuarios

**Solo el usuario admin de oddsound podrá crear nuevos artículos.**

- Admin puede también crear cuentas de nuevos redactores que podrán acceder a la plataforma para crear artículos.
- Esta opción de cuentas se localizara fuera de la opción "Users", creando un tab nuevo que diga "Editors".
- Cuando se cree un nuevo editor desde la cuenta admin, este será notificado via correo electrónico haciendo uso de resend, actualmente ya integrado al proyecto, para que una vez oprima el botón "confirmar cuenta editor" pueda ser redirigido al login de oddsound, ingresar su correo y contraseña.
- El mensaje de este tipo de emails va a ser diferente, solo se les notificará que al orpimir el botón o al confirmar su cuenta editor podrán comenzar a escribir en la plataforma.

**Parámetros de Creación de Redactor:**

- Email (requerido)
- Nombre de usuario (requerido)
- Contraseña (requerido)
- Nombre completo (requerido)

**Permisos Post-Creación:**

- Los redactores pueden actualizar su contraseña en cualquier momento
- Los redactores pueden actualizar su nombre de usuario en cualquier momento
- Los redactores pueden ver y editar su perfil personal
- Los redactores pueden crear, ver, editar y eliminar sus propios artículos

---

### 2. Admin Tiene Todo el Poder

**El admin de oddsound mantendrá acceso completo a:**

- ✅ Dashboard completo (todas las secciones)
- ✅ Crear, ver, editar y eliminar artículos
- ✅ Crear cuentas de redactores
- ✅ Gestionar usuarios (editar, desactivar, cambiar roles)
- ✅ Gestionar colecciones de media
- ✅ Gestionar todas las colecciones administrativas
- ✅ Ver logs de auditoría

**El acceso del admin NO cambia respecto a la versión anterior.**

---

### 3. Restricciones para Redactores

**Los usuarios redactores (creados por admin) solo podrán ver:**

1. **Posts** - Ver, crear, editar y eliminar sus propios artículos
2. **Profiles** - Ver y editar su perfil personal
3. **Media** - Subir y gestionar media para usar en sus artículos

**No tienen acceso a:**

- ❌ Usuarios (no pueden ver otros usuarios)
- ❌ Biographies (sección administrativa)
- ❌ Pages (páginas estáticas del sitio)
- ❌ Categories (administración de categorías)
- ❌ Cualquier otra sección administrativa

**Campos que NO pueden modificar:**

- ❌ Su rol (siempre será "creator")
- ❌ Su tipo de cuenta (siempre será "redactor")
- ❌ Su estado de activación (isActive)

**Campos que SÍ pueden modificar:**

- ✅ Nombre
- ✅ Contraseña
- ✅ Información en su perfil
- ✅ Avatar

---

### 4. Compartir Artículos (Posts)

**Se creará una funcionalidad para compartir los artículos hechos por el admin y/o nuevos usuarios redactores.**

#### Plataformas Soportadas

**Implementadas y Funcionales:**

1. **Facebook** - Compartir artículos con preview
2. **X (Twitter)** - Tweet con enlace y descripción
3. **Threads** - Compartir en Threads (Meta)

**Importante:**

- **Instagram** - Para esta red social podriamos validar como hacer spotify, que comparte un screenshoot de la música que el usuario está escuchándo y quiere compartir en la plataforma. En este caso, vamos a compartir artículos, se le tomará una captura de pantalla automática a lo que se está leyendo, y podrá compartirse como story.

#### Información Compartida

La funcionalidad de compartir incluirá:

1. **Thumbnail de la imagen principal (banner)** del artículo
2. **Título del artículo** - Título completo
3. **Contenido** - Párrafo corto de lo que trata el artículo
4. **Información del autor:**
   - Avatar (imagen del redactor)
   - Nombre del redactor
5. **Enlace al artículo** - Link directo al post en oddsound.co

#### Comportamiento

- El botón estará presente en cada artículo (posts)
- Al hacer click, se abre un modal con preview del artículo
- El usuario puede seleccionar una plataforma para compartir
- Se genera un link específico para cada plataforma
- Para Instagram y TikTok se muestra "Coming Soon" con opción de copiar link

#### Actualización

- La funcionalidad de resedn debe estar funcionando cada vez que se creen nuevos editores, se enviará al correo ingresado el mensaje "confirmar cuenta editor".
- Tipo de cuenta y las opciones de Artista y Banda no deben ser necesarias para crear nuevos editores, este módulo no se debe ver en el formato de creación de editores.
