# Guía de Autenticación para Plaza

Para que Plaza funcione con tu tienda WooCommerce, necesitas configurar la autenticación. Aquí tienes **3 opciones** ordenadas de más fácil a más compleja:

---

## ✅ OPCIÓN 1: Application Passwords (RECOMENDADO - WordPress 5.6+)

Esta es la forma **más segura y moderna** de autenticar con WordPress.

### Pasos:

1. **Ir a tu perfil de usuario en WordPress:**
   - Ve a `Usuarios > Tu Perfil` en el panel de WordPress
   - O directamente: `https://tutienda.com/wp-admin/profile.php`

2. **Crear una Application Password:**
   - Baja hasta la sección **"Application Passwords"**
   - Escribe un nombre (ej: "Plaza Admin")
   - Haz clic en **"Agregar nueva contraseña de aplicación"**
   - **Copia la contraseña** que te muestra (solo se muestra una vez)

3. **Usar en Plaza:**
   - **Usuario:** Tu nombre de usuario de WordPress
   - **Contraseña:** La Application Password que acabas de crear (NO tu contraseña normal)
   - **URL:** La URL de tu tienda (ej: https://tutienda.com)

### Ventajas:
- ✅ Más seguro (contraseñas específicas por aplicación)
- ✅ Puedes revocar fácilmente
- ✅ No requiere plugins adicionales
- ✅ Funciona con WordPress 5.6+

---

## ✅ OPCIÓN 2: Plugin Basic Authentication

Si tu WordPress es anterior a 5.6 o prefieres Basic Auth tradicional:

### Pasos:

1. **Instalar el plugin:**
   - Ve a `Plugins > Añadir nuevo` en WordPress
   - Busca: **"Application Passwords"** o **"Basic Auth"**
   - O instala manualmente: **"WordPress REST API Authentication"** o **"Basic Authentication"**

2. **Plugins recomendados:**
   - **Application Passwords** (oficial de WordPress)
   - **WordPress REST API Authentication** (por miniOrange)
   - **Basic Authentication** (por WP REST API)

3. **Configurar:**
   - Activa el plugin
   - Sigue las instrucciones del plugin para generar credenciales

4. **Usar en Plaza:**
   - **Usuario:** Tu nombre de usuario de WordPress
   - **Contraseña:** La contraseña generada por el plugin
   - **URL:** La URL de tu tienda

---

## ✅ OPCIÓN 3: Configuración en el Servidor (Avanzado)

Si tienes acceso a la configuración del servidor (Apache/Nginx):

### Para Apache (.htaccess):

Agrega esto a tu archivo `.htaccess` en la raíz de WordPress:

```apache
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]
</IfModule>
```

### Para Nginx:

Agrega esto a tu configuración de Nginx:

```nginx
set $auth_header $http_authorization;
if ($auth_header = "") {
    set $auth_header "Basic ";
}
```

**⚠️ Nota:** Esta opción requiere conocimientos técnicos y puede afectar la seguridad de tu sitio.

---

## 🔧 Verificar que Funciona

Para probar si la autenticación está funcionando:

1. Abre la consola del navegador (F12)
2. Intenta iniciar sesión en Plaza
3. Si ves errores, revisa:
   - Que el usuario tenga permisos de **Shop Manager** o **Administrator**
   - Que la URL sea correcta (sin barra final)
   - Que las credenciales sean correctas

---

## 🛡️ Permisos del Usuario

Asegúrate de que el usuario que uses tenga uno de estos roles:
- **Administrator** (puede hacer todo)
- **Shop Manager** (puede gestionar productos y pedidos)

Para verificar:
- Ve a `Usuarios` en WordPress
- Verifica el rol del usuario

---

## ❓ Problemas Comunes

### Error: "Credenciales inválidas"
- Verifica que el usuario y contraseña sean correctos
- Si usas Application Passwords, asegúrate de usar la contraseña de aplicación, NO tu contraseña normal
- Verifica que el usuario tenga permisos suficientes

### Error: "CORS" o "No se puede conectar"
- Verifica que la URL sea correcta
- Asegúrate de que tu sitio tenga SSL (https://)
- Algunos servidores bloquean peticiones desde otros dominios

### Error: "403 Forbidden"
- El usuario no tiene permisos suficientes
- Cambia el rol del usuario a Shop Manager o Administrator

---

## 📝 Nota de Seguridad

- **NUNCA** compartas tus credenciales
- Usa **Application Passwords** en lugar de tu contraseña principal
- Si sospechas que alguien tiene acceso, revoca las Application Passwords inmediatamente
- Considera usar HTTPS siempre

