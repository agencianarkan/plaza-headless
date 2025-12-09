# 🛍️ Plaza - Panel de Administración WooCommerce Headless

Plaza es un panel de administración headless para WooCommerce que permite gestionar productos, pedidos, clientes, reportes y envíos desde una interfaz web moderna y fácil de usar.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Estado del Proyecto](#estado-del-proyecto)
- [Funcionalidades Implementadas](#funcionalidades-implementadas)
- [Despliegue](#despliegue)
- [Solución de Problemas](#solución-de-problemas)

## ✨ Características

- **Headless Architecture**: Frontend completamente separado del backend WordPress/WooCommerce
- **Multi-sitio**: Funciona con múltiples sitios WooCommerce sin modificar el código
- **Interfaz Moderna**: Diseño intuitivo y responsive
- **Autenticación Dual**: 
  - 🔵 **Google OAuth**: Inicio de sesión con un clic usando tu cuenta de Google
  - 👤 **Usuario + Contraseña**: Método tradicional con soporte para Application Passwords
- **Gestión Completa**: Productos, pedidos, clientes, reportes y envíos

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend API**: WooCommerce REST API v3
- **Autenticación**: Basic Auth con Application Passwords
- **Almacenamiento**: LocalStorage para credenciales
- **Hosting**: Compatible con cualquier hosting estático (GitHub Pages, Netlify, Vercel, etc.)

## 📦 Instalación

### Requisitos Previos

- WordPress con WooCommerce instalado
- Usuario con rol de **Shop Manager** o **Administrator**
- WordPress 5.6+ (para Application Passwords) o plugin de Basic Auth
- Hosting estático para los archivos frontend (opcional, puede estar en el mismo servidor)

### Paso 1: Instalar el Plugin PHP

1. Sube el archivo `plaza-upload-endpoint.php` a tu WordPress:
   - Opción A: Como plugin individual
     - Ve a `/wp-content/plugins/`
     - Crea una carpeta `plaza-upload-endpoint/`
     - Coloca el archivo dentro
   - Opción B: Directamente en plugins
     - Coloca `plaza-upload-endpoint.php` en `/wp-content/plugins/`

2. Activa el plugin desde el panel de WordPress:
   - Ve a `Plugins > Plugins instalados`
   - Busca "Plaza Upload Endpoint"
   - Haz clic en "Activar"

### Paso 2: Subir Archivos Frontend

Tienes varias opciones:

#### Opción A: GitHub Pages (Recomendado)

1. Crea un repositorio en GitHub
2. Sube todos los archivos HTML/CSS/JS
3. Activa GitHub Pages en Settings > Pages
4. Tu URL será: `https://tuusuario.github.io/nombre-repo/`

#### Opción B: Subdirectorio en WordPress

1. Crea una carpeta `/plaza/` en la raíz de WordPress
2. Sube todos los archivos HTML/CSS/JS ahí
3. Accede desde: `https://tutienda.com/plaza/`

#### Opción C: Hosting Estático Separado

- Netlify, Vercel, o cualquier hosting estático
- Solo sube los archivos HTML/CSS/JS

**Nota**: El plugin PHP (`plaza-upload-endpoint.php`) SOLO va en WordPress, no en el hosting estático.

## ⚙️ Configuración

### Configurar Autenticación

Plaza requiere autenticación para acceder a la API de WooCommerce. Tienes **2 métodos disponibles**:

#### 🔵 Método 1: Google OAuth (Recomendado)

Inicio de sesión rápido con un clic usando tu cuenta de Google.

**Requisitos:**
- El email de Google debe coincidir con un usuario existente en WordPress
- El usuario debe tener rol de **Administrator** o **Shop Manager**

**Configuración:**
1. Sigue la guía completa en: [`GUIA_GOOGLE_OAUTH.md`](./GUIA_GOOGLE_OAUTH.md)
2. Configura Google Cloud Console
3. Instala y configura el plugin en WordPress

**Ventajas:**
- ✅ Un clic para iniciar sesión
- ✅ Sin recordar contraseñas
- ✅ Más seguro (no manejas contraseñas)
- ✅ Application Password generado automáticamente

#### 👤 Método 2: Usuario + Contraseña Tradicional

Método tradicional con usuario y contraseña de WordPress.

**Opciones de autenticación:**

Plaza requiere autenticación para acceder a la API de WooCommerce. Tienes 3 opciones:

#### Opción 1: Application Passwords (Recomendado - WordPress 5.6+)

1. Ve a `Usuarios > Tu Perfil` en WordPress
2. Baja hasta "Application Passwords"
3. Escribe un nombre (ej: "Plaza Admin")
4. Haz clic en "Agregar nueva contraseña de aplicación"
5. **Copia la contraseña** (solo se muestra una vez)

**Usar en Plaza:**
- Usuario: Tu nombre de usuario de WordPress
- Contraseña: La Application Password (NO tu contraseña normal)
- URL: La URL de tu tienda (ej: https://tutienda.com)

#### Opción 2: Plugin Basic Authentication

Si tu WordPress es anterior a 5.6:

1. Instala un plugin de Basic Auth (ej: "WordPress REST API Authentication")
2. Activa el plugin
3. Sigue las instrucciones del plugin para generar credenciales

#### Opción 3: Configuración en Servidor (Avanzado)

Consulta `GUIA_AUTENTICACION.md` para instrucciones detalladas.

### Permisos del Usuario

El usuario debe tener uno de estos roles:
- **Administrator** (acceso completo, incluye sección de Envíos)
- **Shop Manager** (puede gestionar productos y pedidos)

## 🚀 Uso

### Iniciar Sesión

Plaza ofrece dos métodos para iniciar sesión:

#### 🔵 Opción 1: Iniciar con Google

1. Abre Plaza en tu navegador
2. Ingresa la **URL de tu tienda WooCommerce**
3. Haz clic en **"🔵 Iniciar con Google"**
4. Autoriza en la pantalla de Google
5. ¡Listo! Se iniciará sesión automáticamente

**Nota:** El email de tu cuenta de Google debe coincidir con un usuario existente en WordPress.

#### 👤 Opción 2: Usuario + Contraseña

1. Abre Plaza en tu navegador
2. Ingresa:
   - **URL**: La URL de tu tienda WooCommerce
   - **Usuario**: Tu nombre de usuario de WordPress
   - **Contraseña**: Application Password o contraseña configurada
3. Haz clic en **"Iniciar Sesión"**

### Navegación

- **📊 Dashboard**: Vista general con estadísticas
- **📦 Productos**: Gestión completa de productos
- **🛒 Pedidos**: Gestión de pedidos y cambio de estados
- **👥 Clientes**: Lista de clientes (registrados y guest)
- **📈 Reportes**: Métricas y gráficos de ventas
- **🚚 Envíos**: Gestión de zonas y métodos de envío (solo Admin)

## 📁 Estructura del Proyecto

```
plaza-headless/
├── index.html                    # Página principal
├── styles.css                    # Estilos CSS
├── app.js                        # Lógica principal de la aplicación
├── api.js                        # Cliente API para WooCommerce
├── auth.js                       # Manejo de autenticación (Google OAuth + tradicional)
├── plaza-upload-endpoint.php     # Plugin PHP (subir imágenes + Google OAuth)
├── GUIA_GOOGLE_OAUTH.md          # Guía completa de Google OAuth (NUEVO)
├── GUIA_AUTENTICACION.md         # Guía de configuración de autenticación tradicional
├── INSTRUCCIONES_ENDPOINT.md     # Instrucciones del plugin PHP
└── README.md                     # Este archivo
```

## 📊 Estado del Proyecto

### ✅ Funcionalidades Implementadas

#### Autenticación
- [x] Login con Basic Auth (método tradicional)
- [x] 🔵 Login con Google OAuth (nuevo)
- [x] Soporte para Application Passwords
- [x] Generación automática de Application Passwords con Google OAuth
- [x] Detección automática de roles de usuario
- [x] Menú condicional según permisos (Admin vs Shop Manager)
- [x] Almacenamiento seguro de credenciales en LocalStorage
- [x] Validación de email existente en WordPress (Google OAuth)

#### Dashboard
- [x] Vista general con estadísticas
- [x] Contador de productos
- [x] Contador de pedidos
- [x] Pedidos pendientes
- [x] Pedidos completados

#### Gestión de Productos
- [x] Listar productos con paginación
- [x] Buscar productos
- [x] Filtrar por estado (publicado, borrador, pendiente)
- [x] Crear nuevo producto
- [x] Editar producto existente
- [x] Eliminar producto (desde modal de edición)
- [x] Ver producto en la tienda (enlace público)
- [x] Gestión de imágenes:
  - [x] Subir imágenes desde archivo
  - [x] Agregar imágenes por URL
  - [x] Vista previa de imágenes
  - [x] Eliminar imágenes
  - [x] Múltiples imágenes (primera como principal)
- [x] Editor de texto enriquecido:
  - [x] Descripción corta
  - [x] Descripción larga
  - [x] Modo visual y código
  - [x] Formato de texto (negrita, cursiva, etc.)
- [x] Información de envío:
  - [x] Peso (kg)
  - [x] Dimensiones (largo, ancho, alto en cm)
  - [x] Clase de envío (dropdown dinámico)

#### Gestión de Pedidos
- [x] Listar pedidos con paginación
- [x] Buscar pedidos
- [x] Filtrar por estado
- [x] Cambiar estado de pedido
- [x] Ver información del pedido

#### Gestión de Clientes
- [x] Listar clientes registrados
- [x] Incluir clientes guest (de pedidos)
- [x] Mostrar: Nombre, Email, Teléfono, Dirección
- [x] Buscar clientes
- [x] Paginación

#### Reportes
- [x] Filtros de fecha (desde/hasta)
- [x] KPIs principales:
  - [x] Ventas totales
  - [x] Pedidos
  - [x] Ticket promedio
  - [x] Clientes
  - [x] Productos vendidos
  - [x] Productos únicos
- [x] Gráfico de estados de pedidos
- [x] Top 10 productos más vendidos

#### Envíos (Solo Administrador)
- [x] Listar zonas de envío
- [x] Ver métodos de envío por zona
- [x] Crear nueva zona de envío
- [x] Editar zona de envío
- [x] Eliminar zona de envío
- [x] Eliminar método de envío
- [x] Configuración de ubicaciones:
  - [x] Todos los países
  - [x] Países específicos
  - [x] Estados/Provincias específicos
  - [x] Códigos postales específicos

### 🚧 Funcionalidades Pendientes

#### Envíos
- [ ] Añadir método de envío a una zona
- [ ] Editar método de envío
- [ ] Configurar opciones de métodos de envío (precio, condiciones, etc.)

#### Productos
- [ ] Gestión de variaciones
- [ ] Gestión de atributos
- [ ] Gestión de categorías y etiquetas
- [ ] Gestión de inventario avanzada
- [ ] Productos descargables

#### Pedidos
- [ ] Ver detalles completos del pedido
- [ ] Editar pedido
- [ ] Agregar notas al pedido
- [ ] Enviar email al cliente

#### Reportes
- [ ] Exportar reportes a CSV/Excel
- [ ] Más gráficos y métricas
- [ ] Comparación de períodos

#### General
- [ ] Multi-idioma
- [ ] Temas personalizables
- [ ] Notificaciones en tiempo real
- [ ] Modo oscuro

## 🌐 Despliegue

### Opción 1: GitHub Pages

1. Crea un repositorio en GitHub
2. Sube los archivos HTML/CSS/JS
3. Ve a Settings > Pages
4. Selecciona la rama `main` y carpeta `/ (root)`
5. Tu sitio estará disponible en: `https://tuusuario.github.io/nombre-repo/`

**Ventajas:**
- Gratis
- Actualización automática con GitHub Desktop
- CDN global
- HTTPS incluido

### Opción 2: Netlify

1. Crea cuenta en Netlify
2. Arrastra la carpeta del proyecto
3. Tu sitio estará disponible en: `https://nombre-proyecto.netlify.app`

### Opción 3: Vercel

1. Crea cuenta en Vercel
2. Conecta tu repositorio de GitHub
3. Deploy automático

### Opción 4: Subdirectorio en WordPress

1. Crea carpeta `/plaza/` en la raíz de WordPress
2. Sube archivos HTML/CSS/JS
3. Accede desde: `https://tutienda.com/plaza/`

## 🔧 Solución de Problemas

### Error: "Credenciales inválidas"

- Verifica que el usuario y contraseña sean correctos
- Si usas Application Passwords, asegúrate de usar la contraseña de aplicación, NO tu contraseña normal
- Verifica que el usuario tenga rol de Shop Manager o Administrator

### Error: "No tienes permisos para acceder a esta sección"

- El usuario debe tener rol de **Administrator** para acceder a Envíos
- **Shop Manager** puede acceder a Productos, Pedidos, Clientes y Reportes

### Error: "No se puede conectar al servidor"

- Verifica que la URL sea correcta (sin barra final)
- Asegúrate de que tu sitio tenga SSL (https://)
- Verifica que Basic Auth esté habilitado

### Error: "Sorry, you cannot list resources"

- Verifica que el usuario tenga permisos suficientes
- Asegúrate de que WooCommerce esté instalado y activo
- Verifica que la API REST de WooCommerce esté habilitada

### Las imágenes no se suben

- Verifica que el plugin `plaza-upload-endpoint.php` esté instalado y activo
- Verifica que el usuario tenga permisos para subir archivos
- Revisa los logs de WordPress para ver errores específicos

### El menú de Envíos no aparece

- Solo usuarios con rol de **Administrator** pueden ver este menú
- Verifica que el usuario tenga el rol correcto en WordPress
- Recarga la página después de iniciar sesión

## 📝 Notas Técnicas

### Arquitectura

- **Frontend**: Aplicación SPA (Single Page Application) en JavaScript vanilla
- **Backend**: WooCommerce REST API v3
- **Comunicación**: Peticiones HTTP con Basic Auth
- **Almacenamiento**: LocalStorage para credenciales y preferencias

### Endpoints Utilizados

**WooCommerce API:**
- `/wp-json/wc/v3/products` - Productos
- `/wp-json/wc/v3/orders` - Pedidos
- `/wp-json/wc/v3/customers` - Clientes
- `/wp-json/wc/v3/shipping/zones` - Zonas de envío
- `/wp-json/wc/v3/settings` - Configuración

**Endpoints Personalizados (Plugin):**
- `/wp-json/plaza/v1/upload-image` - Subir imágenes
- `/wp-json/plaza/v1/google-client-id` - Obtener Client ID de Google (público)
- `/wp-json/plaza/v1/google-auth` - Autenticación con Google OAuth (público)

### Compatibilidad

- **Navegadores**: Chrome, Firefox, Safari, Edge (últimas versiones)
- **WordPress**: 5.0+
- **WooCommerce**: 3.0+
- **Dispositivos**: Desktop y Tablet (responsive)

## 🤝 Contribuciones

Este es un proyecto personal, pero las sugerencias y mejoras son bienvenidas.

## 📄 Licencia

Este proyecto es de uso personal. Adapta según tus necesidades.

## 📞 Soporte

Para problemas o preguntas:
1. Revisa la sección de Solución de Problemas
2. Verifica los logs de la consola del navegador (F12)
3. Revisa los logs de WordPress

---

**Versión**: 1.0  
**Última actualización**: 2024  
**Estado**: En desarrollo activo

