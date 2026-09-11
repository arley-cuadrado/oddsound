## Fan Comments Spec

Fecha de referencia: August 25, 2026.

### Objetivo

El sistema de comentarios fan debe permitir participación pública visible en los releases, junto con controles simples de eliminación para el propio fan y para el dashboard interno.

### Reglas de visibilidad pública

- Todo comentario publicado debe mostrarse públicamente en la página de detalle del release del artista o banda.
- La visibilidad pública no debe depender de que el fan autor del comentario siga logueado.
- Un comentario recién publicado no debe quedar visible únicamente para su autor.
- Los comentarios públicos del release deben seguir apareciendo en orden cronológico inverso, salvo que producto defina otra regla más adelante.

### Reglas de eliminación desde el fan

- El fan autor de un comentario debe poder eliminarlo desde la experiencia pública del detalle del release asociado.
- La acción de eliminación debe mostrarse únicamente para el fan dueño del comentario.
- Antes de eliminar, la interfaz debe mostrar una confirmación simple.
- Si el fan confirma la eliminación, el comentario debe desaparecer del detalle público del release y de su historial de cuenta.

### Reglas de eliminación desde dashboard

- El dashboard interno también debe permitir eliminar comentarios.
- La acción debe mostrarse con el texto `Eliminar`.
- Antes de ejecutar la eliminación desde dashboard, debe mostrarse una confirmación simple.

### Reglas de metadatos visibles

- Los comentarios mostrados en el perfil público del artista o banda deben incluir su fecha de creación.
- Los comentarios mostrados en el dashboard o cuenta del fan también deben incluir su fecha de creación.
- La fecha visible debe corresponder al momento real de creación del comentario, no al de edición o moderación.

### Criterios de aceptación

- Un comentario creado por un fan autenticado se muestra públicamente en el detalle del release sin requerir que el autor permanezca logueado.
- Otro visitante puede ver ese comentario publicado en la misma página pública del release.
- El fan autor puede eliminar su propio comentario desde el detalle del release después de aceptar una confirmación simple.
- Un comentario eliminado por su autor deja de aparecer tanto en la vista pública como en la cuenta del fan.
- El dashboard permite eliminar comentarios usando una acción visible llamada `Eliminar` y una confirmación simple.
- La vista pública del release y el dashboard o cuenta del fan muestran la fecha de creación de cada comentario.
