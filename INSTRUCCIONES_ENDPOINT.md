# Instrucciones para Instalar el Endpoint de Subida de Imágenes

Este endpoint permite subir imágenes directamente desde Plaza a tu WordPress/WooCommerce.

## 📋 Opción 1: Instalar como Plugin (RECOMENDADO)

### Pasos:

1. **Accede a tu servidor WordPress:**
   - Por FTP, cPanel File Manager, o SSH

2. **Ve a la carpeta de plugins:**
   - Ruta: `/wp-content/plugins/`

3. **Crea una nueva carpeta:**
   - Nombre: `plaza-upload-endpoint`

4. **Sube el archivo:**
   - Copia el archivo `plaza-upload-endpoint.php` a esa carpeta
   - Ruta final: `/wp-content/plugins/plaza-upload-endpoint/plaza-upload-endpoint.php`

5. **Activa el plugin:**
   - Ve a `Plugins` en el panel de WordPress
   - Busca "Plaza Upload Endpoint"
   - Haz clic en "Activar"

6. **¡Listo!** El endpoint estará disponible en:
   - `https://tutienda.com/wp-json/plaza/v1/upload-image`

---

## 📋 Opción 2: Agregar a functions.php (Alternativa)

Si prefieres no crear un plugin:

1. **Accede a tu tema:**
   - Ve a `Apariencia > Editor` en WordPress
   - O por FTP: `/wp-content/themes/tu-tema/functions.php`

2. **Abre el archivo `functions.php`**

3. **Agrega el código al final del archivo:**
   - Copia TODO el contenido de `plaza-upload-endpoint.php`
   - Pega al final de `functions.php`
   - **IMPORTANTE:** Quita las primeras líneas del plugin (las que dicen `Plugin Name`, etc.)

4. **Guarda el archivo**

5. **¡Listo!** El endpoint estará disponible

---

## ✅ Verificar que Funciona

### Método 1: Desde el navegador
1. Abre: `https://tutienda.com/wp-json/plaza/v1/upload-image`
2. Deberías ver un mensaje de error (eso es normal, significa que el endpoint existe)
3. Si ves "404 Not Found", el endpoint no está instalado correctamente

### Método 2: Desde Plaza
1. Abre Plaza y edita un producto
2. Haz clic en "📁 Subir Archivo"
3. Selecciona una imagen
4. Si se sube correctamente, ¡funciona!

---

## 🔒 Permisos Requeridos

El usuario que uses en Plaza debe tener:
- **Rol:** Shop Manager o Administrator
- **Capacidad:** `upload_files` (normalmente viene con estos roles)

---

## ⚠️ Solución de Problemas

### Error: "Usuario no autenticado"
- Verifica que estés usando Application Passwords correctamente
- Asegúrate de que el usuario tenga permisos

### Error: "No tienes permisos para subir archivos"
- El usuario necesita el rol de Shop Manager o Administrator
- Verifica en `Usuarios > Tu Usuario` que tenga el rol correcto

### Error: "404 Not Found"
- El endpoint no está instalado
- Verifica que el archivo esté en la ubicación correcta
- Asegúrate de que el plugin esté activado (si usaste la Opción 1)

### Error: "Formato de imagen inválido"
- Solo se aceptan imágenes: JPG, PNG, GIF, WEBP
- Verifica que el archivo sea una imagen válida

### Error: "La imagen es muy grande"
- El límite por defecto de WordPress es 64MB
- Si necesitas cambiar el límite, agrega esto a `wp-config.php`:
  ```php
  @ini_set( 'upload_max_size' , '64M' );
  @ini_set( 'post_max_size', '64M');
  @ini_set( 'max_execution_time', '300' );
  ```

---

## 🔧 Personalización (Opcional)

Si quieres cambiar el tamaño máximo de archivo o otros parámetros, edita el archivo `plaza-upload-endpoint.php`:

```php
// Cambiar tipos de imagen permitidos (línea ~50)
$allowed_types = array('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg');

// Cambiar tamaño máximo (línea ~80 en app.js)
if (file.size > 10 * 1024 * 1024) { // 10MB en lugar de 5MB
```

---

## 📝 Notas Importantes

- Las imágenes se suben a la carpeta `/wp-content/uploads/` de WordPress
- Las imágenes quedan disponibles en la Biblioteca de Medios de WordPress
- Puedes eliminar las imágenes desde WordPress si es necesario
- El endpoint usa autenticación Basic Auth (la misma que Plaza)

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas:
1. Revisa la consola del navegador (F12) para ver errores
2. Verifica los logs de WordPress si tienes acceso
3. Asegúrate de que PHP tenga permisos para escribir en `/wp-content/uploads/`

