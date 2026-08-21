# ODDSOUND Project - Instructions for AI Agents

## Technical Reference

This project uses the Payload CMS skill at `.agents/skills/payload/`.
Start with `.agents/skills/payload/SKILL.md` for a quick reference, then see `.agents/skills/payload/reference/` for detailed docs.

---

## 📋 Business Requirements & Features

### 1. Crear Artículos y Usuarios

**Solo el usuario admin de oddsound podrá crear nuevos artículos.**

Admin puede también crear cuentas de nuevos redactores que podrán acceder a la plataforma para crear artículos.

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

**Coming Soon:**
- **Instagram** - No tiene API pública de share programático
- **TikTok** - No tiene API pública de share programático

#### Información Compartida

La funcionalidad de compartir incluirá:

1. **Thumbnail de la imagen principal (banner)** del artículo
2. **Título del artículo** - Título completo
3. **Contenido** - Máximo 3 líneas del párrafo subsiguiente al título
4. **Información del autor:**
   - Avatar (imagen del redactor)
   - Nombre del redactor
   - Enlace al perfil del redactor
5. **Enlace al artículo** - Link directo al post en oddsound.co

#### Comportamiento

- El botón estará presente en cada artículo (posts)
- Al hacer click, se abre un modal con preview del artículo
- El usuario puede seleccionar una plataforma para compartir
- Se genera un link específico para cada plataforma
- Para Instagram y TikTok se muestra "Coming Soon" con opción de copiar link

---

## 🛠️ Guidelines para Agentes de IA

### Cuando trabajes en nuevas funcionalidades:

1. **Verifica acceso** - Siempre considera si admin/redactor/público pueden acceder
2. **Respeta restricciones** - No des permisos que violen las restricciones establecidas
3. **Mantén seguridad** - Los campos administrativos deben estar protegidos
4. **Documenta cambios** - Actualiza esta guía si hay nuevas instrucciones
5. **Prueba permisos** - Valida que los permisos se apliquen correctamente

### Reglas de Seguridad:

- ✅ El rol "creator" solo debe ver sus propios posts
- ✅ Los campos role, accountType, isActive solo deben ser editables por admin
- ✅ Las colecciones ocultas nunca deben aparecer en el dashboard del redactor
- ✅ La API backend respeta los mismos permisos que el frontend
- ✅ Los redactores NO pueden cambiar su rol
- ✅ Los redactores NO pueden ver otros usuarios
- ✅ El admin conserva acceso total a todo

### Verificaciones Antes de Deploy:

1. ✅ Build sin errores
2. ✅ TypeScript sin errores
3. ✅ Pruebas de acceso (admin vs redactor)
4. ✅ Permisos a nivel de campo funcionales
5. ✅ Componentes de UI se renderizan correctamente
6. ✅ No hay información filtrada en API responses

---

## 📊 Matriz de Acceso Rápida

```
Recurso                Admin    Redactor   Público
────────────────────────────────────────────────
Posts (todos)            RW         -          R
Posts (propios)          RW        R/W         R
Users                    RW         -          -
Profiles                 RW        R/W         -
Media                    RW        R/W         -
Categories               RW         -          -
Biographies              RW         -          -
Pages                    RW         -          -

Legend: R=Read, W=Write, RW=Read+Write, -=No access
```

---

## ✅ Funcionalidades Implementadas

- [x] Sistema de roles (admin, creator)
- [x] Acceso restringido por rol
- [x] Creación de redactores por admin
- [x] Formulario de creación con validación
- [x] Dashboard filtrado para redactores
- [x] Compartir posts en Facebook
- [x] Compartir posts en X (Twitter)
- [x] Compartir posts en Threads
- [x] Preview de posts en compartir
- [x] Información del autor en preview
- [x] Permisos a nivel de campo
- [x] Seguridad de API

---

## 📝 Documentación Relacionada

- `TEST_PLAN.md` - Plan detallado de pruebas con 50+ escenarios
- `SECURITY_VERIFICATION.md` - Análisis de seguridad y mitigación
- `.copilot/session-state/.../IMPLEMENTATION_SUMMARY.md` - Resumen ejecutivo
