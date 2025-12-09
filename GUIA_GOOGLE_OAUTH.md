# 🔐 Guía de Configuración: Google OAuth + Login Tradicional en Plaza

Esta guía explica cómo configurar la autenticación dual en Plaza: **Google OAuth** y **Usuario + Contraseña tradicional**.

---

## 📋 Tabla de Contenidos

1. [Resumen de Funcionalidades](#resumen-de-funcionalidades)
2. [Configuración de Google Cloud Console](#configuración-de-google-cloud-console)
3. [Instalación del Plugin en WordPress](#instalación-del-plugin-en-wordpress)
4. [Verificación y Pruebas](#verificación-y-pruebas)
5. [Solución de Problemas](#solución-de-problemas)

---

## ✨ Resumen de Funcionalidades

### Métodos de Autenticación Disponibles

1. **🔵 Iniciar con Google** (Nuevo)
   - Un clic para iniciar sesión
   - Requiere que el email de Google coincida con un usuario existente en WordPress
   - Genera Application Password automáticamente

2. **👤 Usuario + Contraseña** (Tradicional)
   - Método original mantenido
   - Soporta Application Passwords de WordPress
   - Funciona como antes

### Requisitos

- WordPress 5.6+ (para Application Passwords)
- WooCommerce instalado
- Usuario con rol **Administrator** o **Shop Manager**
- Acceso a Google Cloud Console
- Acceso para instalar plugins en WordPress

---

## 🔧 Configuración de Google Cloud Console

### Paso 1.1: Crear Proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Seleccionar proyecto"** → **"NUEVO PROYECTO"**
4. Nombre del proyecto: `Plaza OAuth` (o el que prefieras)
5. Haz clic en **"Crear"**
6. Espera a que se cree el proyecto (puede tardar unos segundos)
7. Selecciona el proyecto recién creado

---

### Paso 1.2: Habilitar API

1. En el menú lateral, ve a **"APIs y servicios"** → **"Biblioteca"**
2. En el buscador, escribe: **"Identity Toolkit API"**
3. Selecciona **"Identity Toolkit API"**
   - Descripción: "The Google Identity Toolkit API lets you use open standards to verify a user's identity."
4. Haz clic en **"HABILITAR"**
5. Espera a que se habilite (puede tardar unos segundos)

**Nota:** Si no encuentras "Identity Toolkit API", puedes continuar sin habilitarla. OAuth 2.0 puede funcionar sin esta API, pero es recomendable habilitarla.

---

### Paso 1.3: Crear Credenciales OAuth 2.0

1. En el menú lateral, ve a **"APIs y servicios"** → **"Credenciales"**
2. Haz clic en **"+ CREAR CREDENCIALES"** → **"ID de cliente de OAuth"**

#### Configuración de la Credencial:

**¿Qué API estás usando?**
- Selecciona: **"Identity Toolkit API"** (o déjalo en blanco si no la habilitaste)

**¿A qué datos quieres acceder?**
- ✅ Selecciona: **"Datos de los usuarios"** (User data)
  - Descripción: "Son datos que pertenecen a un usuario de Google, como su dirección de correo electrónico o edad. El consentimiento del usuario es obligatorio. Esto creará un cliente de OAuth."
  - ⚠️ **NO selecciones** "Datos de aplicaciones" (eso crea una cuenta de servicio, no un cliente OAuth)

3. Haz clic en **"Siguiente"**

#### Configuración de la Aplicación Web:

**Tipo de aplicación:**
- Selecciona: **"Aplicación web"**

**Nombre:**
- Escribe: `Plaza Headless` (o el nombre que prefieras)

**Orígenes JavaScript autorizados:**
- Haz clic en **"+ AÑADIR URI"**
- Agrega: `https://agencianarkan.github.io`

**URI de redirección autorizados:**
- Haz clic en **"+ AÑADIR URI"**
- Agrega: `https://agencianarkan.github.io/plaza-headless/`
- ⚠️ **IMPORTANTE:** La URL debe terminar con `/` (barra final)

4. Haz clic en **"CREAR"**

#### Obtener Credenciales:

5. Se mostrará una ventana con:
   - **ID de cliente:** `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - **Secreto de cliente:** `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

6. **⚠️ IMPORTANTE:** Copia ambos valores y guárdalos en un lugar seguro
   - El **Secreto de cliente** solo se muestra una vez
   - Si lo pierdes, tendrás que crear nuevas credenciales

7. Haz clic en **"Listo"**

---

### ✅ Resumen del Paso 1 (Google Cloud Console)

Al finalizar, debes tener:
- ✅ Proyecto creado en Google Cloud Console
- ✅ Identity Toolkit API habilitada (opcional pero recomendado)
- ✅ Credenciales OAuth 2.0 creadas:
  - ✅ Client ID (ID de cliente)
  - ✅ Client Secret (Secreto de cliente)
- ✅ URLs configuradas:
  - ✅ Origen: `https://agencianarkan.github.io`
  - ✅ Redirección: `https://agencianarkan.github.io/plaza-headless/`

---

## 📦 Instalación del Plugin en WordPress

> **⏸️ PUNTO DE PAUSA:** Puedes detenerte aquí y continuar en otro equipo. Solo necesitas tener:
> - El archivo `plaza-upload-endpoint.php` actualizado
> - El Client ID y Client Secret de Google

### Paso 2.1: Subir Plugin a WordPress

1. **Accede al servidor WordPress:**
   - Por **FTP** (FileZilla, etc.)
   - Por **cPanel File Manager**
   - Por **SSH** (si tienes acceso)

2. **Navega a la carpeta de plugins:**
   - Ruta: `/wp-content/plugins/`

3. **Sube el archivo:**
   - Si el plugin **NO existe**: Sube `plaza-upload-endpoint.php` directamente
   - Si el plugin **YA existe**: Reemplázalo con la nueva versión

4. **Verifica que el archivo esté en:**
   - `/wp-content/plugins/plaza-upload-endpoint.php`

---

### Paso 2.2: Activar Plugin

1. **Accede al panel de WordPress:**
   - Ve a: `https://tu-tienda.com/wp-admin`

2. **Ve a Plugins:**
   - Menú lateral: **"Plugins"** → **"Plugins instalados"**

3. **Busca el plugin:**
   - Busca: **"Plaza Upload Endpoint"**

4. **Activa el plugin:**
   - Haz clic en **"Activar"** debajo del nombre del plugin

5. **Verifica que esté activo:**
   - Debe aparecer en azul con texto "Desactivar"

---

### Paso 2.3: Configurar Google OAuth

1. **Accede a la configuración:**
   - Menú lateral: **"Configuración"** → **"Plaza"**
   - O directamente: `https://tu-tienda.com/wp-admin/options-general.php?page=plaza-settings`

2. **Configura las credenciales:**
   - **Google Client ID:**
     - Pega el **Client ID** que copiaste de Google Cloud Console
     - Formato: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   
   - **Google Client Secret:**
     - Pega el **Client Secret** que copiaste de Google Cloud Console
     - Formato: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

3. **Guarda los cambios:**
   - Haz clic en **"Guardar cambios"** al final de la página

4. **Verifica que se guardaron:**
   - Los campos deben mantener los valores después de guardar

---

### Paso 2.4: Verificar Usuarios en WordPress

Antes de probar, asegúrate de que:

1. **Los usuarios existan en WordPress:**
   - Ve a: **"Usuarios"** → **"Todos los usuarios"**
   - Verifica que los usuarios que usarán Google OAuth estén registrados

2. **El email coincida exactamente:**
   - El email de la cuenta de Google debe ser **exactamente igual** al email en WordPress
   - Ejemplo: Si en Google es `usuario@gmail.com`, en WordPress también debe ser `usuario@gmail.com`
   - ⚠️ **Case-sensitive:** `Usuario@gmail.com` ≠ `usuario@gmail.com` (en algunos casos)

3. **Los usuarios tengan permisos:**
   - Rol: **Administrator** o **Shop Manager**
   - Verifica en: **"Usuarios"** → Editar usuario → **"Rol"**

---

### ✅ Resumen del Paso 2 (WordPress)

Al finalizar, debes tener:
- ✅ Plugin `plaza-upload-endpoint.php` subido y activado
- ✅ Client ID configurado en WordPress
- ✅ Client Secret configurado en WordPress
- ✅ Usuarios verificados en WordPress con emails que coincidan con Google

---

## 🧪 Verificación y Pruebas

### Prueba 1: Login Tradicional

1. Ve a: `https://agencianarkan.github.io/plaza-headless/`
2. Ingresa:
   - **URL:** `https://tu-tienda.com`
   - **Usuario:** Tu usuario de WordPress
   - **Contraseña:** Tu contraseña o Application Password
3. Haz clic en **"Iniciar Sesión"**
4. **Resultado esperado:** Debe iniciar sesión y mostrar el Dashboard

---

### Prueba 2: Login con Google

1. Ve a: `https://agencianarkan.github.io/plaza-headless/`
2. Ingresa:
   - **URL:** `https://tu-tienda.com`
3. Haz clic en **"🔵 Iniciar con Google"**
4. **Resultado esperado:**
   - Debe redirigir a Google
   - Debe mostrar pantalla de autorización de Google
   - Después de autorizar, debe volver a Plaza
   - Debe iniciar sesión automáticamente
   - Debe mostrar el Dashboard

---

### Prueba 3: Error - Email No Registrado

1. Intenta iniciar sesión con Google usando un email que **NO existe** en WordPress
2. **Resultado esperado:**
   - Debe mostrar error: "Este email no está registrado en WordPress. Contacta al administrador."

---

## 🔍 Solución de Problemas

### Error: "Google OAuth no está configurado"

**Causa:** El Client ID o Client Secret no están configurados en WordPress.

**Solución:**
1. Ve a: **"Configuración"** → **"Plaza"**
2. Verifica que ambos campos estén llenos
3. Guarda los cambios nuevamente

---

### Error: "Este email no está registrado"

**Causa:** El email de Google no coincide con ningún usuario en WordPress.

**Solución:**
1. Verifica el email en Google (cuenta que usaste)
2. Verifica el email en WordPress (ve a "Usuarios" → Editar usuario)
3. Asegúrate de que sean **exactamente iguales** (incluyendo mayúsculas/minúsculas)
4. Si no existe el usuario, créalo en WordPress primero

---

### Error: "redirect_uri_mismatch"

**Causa:** La URL de redirección en Google Cloud Console no coincide.

**Solución:**
1. Ve a Google Cloud Console → **"Credenciales"**
2. Edita tu credencial OAuth 2.0
3. Verifica que la **URI de redirección autorizados** sea exactamente:
   - `https://agencianarkan.github.io/plaza-headless/`
4. Debe terminar con `/` (barra final)
5. Guarda los cambios
6. Espera 1-2 minutos para que se actualice

---

### Error: "invalid_client"

**Causa:** El Client ID o Client Secret son incorrectos.

**Solución:**
1. Verifica que copiaste correctamente desde Google Cloud Console
2. Verifica que no haya espacios extra al inicio o final
3. Si es necesario, crea nuevas credenciales en Google Cloud Console
4. Actualiza los valores en WordPress

---

### El botón "Iniciar con Google" no aparece

**Causa:** El archivo `index.html` no está actualizado.

**Solución:**
1. Verifica que `index.html` tenga el botón de Google
2. Si usas GitHub Pages, asegúrate de hacer commit y push de los cambios
3. Espera a que GitHub Pages actualice (puede tardar 1-2 minutos)

---

### Error 404 al llamar a `/wp-json/plaza/v1/google-auth`

**Causa:** El plugin no está activado o el archivo no está en la ubicación correcta.

**Solución:**
1. Verifica que el plugin esté activado en WordPress
2. Verifica que el archivo esté en `/wp-content/plugins/plaza-upload-endpoint.php`
3. Intenta desactivar y reactivar el plugin
4. Verifica los permisos del archivo (debe ser 644 o 755)

---

### Error: "Application Passwords no está disponible"

**Causa:** WordPress es anterior a la versión 5.6.

**Solución:**
1. Actualiza WordPress a la versión 5.6 o superior
2. O instala un plugin que agregue soporte para Application Passwords

---

## 📝 Notas Importantes

### Seguridad

1. **Client Secret:** Nunca lo expongas en el frontend. Solo debe estar en WordPress (server-side).
2. **Application Passwords:** Se generan automáticamente en cada login con Google. No se reutilizan.
3. **HTTPS:** Requerido para Google OAuth en producción. GitHub Pages ya lo proporciona.

### Limitaciones

1. **Email debe existir:** El email de Google debe coincidir con un usuario existente en WordPress.
2. **Un usuario por email:** No se pueden tener múltiples usuarios con el mismo email.
3. **Rol fijo:** Los usuarios nuevos (si se implementara creación automática) tendrían rol Administrator.

### Mantenimiento

1. **Renovar credenciales:** Si cambias las credenciales en Google Cloud Console, actualízalas también en WordPress.
2. **Verificar usuarios:** Periódicamente verifica que los usuarios sigan existiendo en WordPress.
3. **Logs:** Revisa los logs de WordPress si hay problemas de autenticación.

---

## 🆘 Soporte

Si tienes problemas:

1. **Revisa la consola del navegador:**
   - Presiona `F12` → Pestaña "Console"
   - Busca errores en rojo

2. **Revisa los logs de WordPress:**
   - Si tienes acceso, revisa `/wp-content/debug.log`

3. **Verifica la configuración:**
   - Google Cloud Console: URLs de redirección
   - WordPress: Client ID y Client Secret
   - WordPress: Usuarios y emails

4. **Prueba el endpoint manualmente:**
   - Ve a: `https://tu-tienda.com/wp-json/plaza/v1/google-client-id`
   - Debe devolver: `{"client_id":"...","configured":true}`

---

## ✅ Checklist Final

Antes de considerar la implementación completa:

- [ ] Proyecto creado en Google Cloud Console
- [ ] Identity Toolkit API habilitada (opcional)
- [ ] Credenciales OAuth 2.0 creadas
- [ ] URLs de redirección configuradas correctamente
- [ ] Plugin subido a WordPress
- [ ] Plugin activado en WordPress
- [ ] Client ID configurado en WordPress
- [ ] Client Secret configurado en WordPress
- [ ] Usuarios verificados en WordPress
- [ ] Login tradicional funciona
- [ ] Login con Google funciona
- [ ] Error de email no registrado funciona correctamente

---

**Versión:** 2.0  
**Última actualización:** 2024  
**Estado:** Implementación completa

