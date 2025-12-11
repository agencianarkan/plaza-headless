# 📚 Documentación Completa - Plaza Headless

**Versión:** 3.0  
**Fecha:** Diciembre 2024  
**Estado:** Sistema Multi-Tienda con Autenticación Centralizada

---

## 📋 Tabla de Contenidos

1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Base de Datos](#base-de-datos)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Configuración Inicial](#configuración-inicial)
6. [Sistema de Autenticación](#sistema-de-autenticación)
7. [API Endpoints](#api-endpoints)
8. [Panel de Administración](#panel-de-administración)
9. [Guías de Uso](#guías-de-uso)
10. [Troubleshooting](#troubleshooting)
11. [Estado Actual](#estado-actual)

---

## 🎯 Descripción del Proyecto

**Plaza** es un panel de administración headless para WooCommerce que permite gestionar múltiples tiendas desde una única interfaz. El sistema utiliza una arquitectura de tres capas:

- **Frontend (SPA)**: Interfaz web en JavaScript vanilla
- **Backend PHP**: API REST que actúa como proxy y gestor de autenticación
- **WooCommerce**: API REST de WordPress/WooCommerce

### Características Principales

✅ **Multi-Tienda**: Un usuario puede estar asignado a una tienda específica  
✅ **Autenticación Centralizada**: Los usuarios se autentican con credenciales de Plaza (no WordPress)  
✅ **Proxy Seguro**: Las credenciales de WooCommerce se almacenan encriptadas en la base de datos  
✅ **Panel de Administración**: Gestión de tiendas y usuarios desde un panel web  
✅ **Sesiones Tokenizadas**: Sistema de sesiones con tokens seguros  
✅ **Cambio de Contraseñas**: Los usuarios pueden cambiar su contraseña de Plaza

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐
│   Frontend      │
│  (JavaScript)   │
│  plaza.narkan.cl│
└────────┬────────┘
         │
         │ HTTP Requests
         │ (token en headers)
         ▼
┌─────────────────┐
│  Backend PHP    │
│  /api/api/      │
│  - auth.php     │
│  - proxy.php    │
└────────┬────────┘
         │
         │ Desencripta credenciales
         │ Obtiene tienda del usuario
         │
         ▼
┌─────────────────┐
│   Base de       │
│   Datos MySQL   │
│  - usuarios_plaza│
│  - tiendas      │
│  - sesiones     │
└────────┬────────┘
         │
         │ Con credenciales desencriptadas
         │
         ▼
┌─────────────────┐
│  WooCommerce    │
│  REST API v3    │
│  (tienda.com)   │
└─────────────────┘
```

### Flujo de Autenticación

1. Usuario ingresa email/username y contraseña en el frontend
2. Frontend envía credenciales a `/api/api/auth.php`
3. Backend verifica credenciales en `usuarios_plaza`
4. Backend obtiene la tienda asignada al usuario
5. Backend genera un token de sesión y lo guarda en `sesiones`
6. Backend retorna: `token`, `usuario`, `tienda` al frontend
7. Frontend guarda estos datos en `localStorage`
8. Frontend usa el `token` en todas las peticiones a `/api/api/proxy.php`
9. `proxy.php` verifica el token, obtiene la tienda, desencripta credenciales y hace la petición a WooCommerce

---

## 💾 Base de Datos

### Estructura de Tablas

#### Tabla: `tiendas`

Almacena la información de las tiendas WooCommerce.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT PRIMARY KEY AUTO_INCREMENT | ID único de la tienda |
| `nombre` | VARCHAR(255) | Nombre descriptivo de la tienda |
| `url` | VARCHAR(500) | URL base de la tienda (ej: https://mitienda.com) |
| `wp_user` | VARCHAR(100) | Usuario de WordPress para autenticación |
| `app_password_encrypted` | TEXT | Application Password encriptado (AES-256-CBC) |
| `activa` | TINYINT(1) DEFAULT 1 | Estado activo/inactivo (1=activa, 0=inactiva) |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

**Índices:**
- PRIMARY KEY: `id`
- INDEX: `activa`

**Ejemplo de datos:**
```sql
INSERT INTO tiendas (nombre, url, wp_user, app_password_encrypted, activa) 
VALUES (
  'Mi Tienda',
  'https://mitienda.com',
  'admin',
  'Nk1KbEhlZ2IUWkNmUIBwaHFmVXhyNT...', -- Encriptado
  1
);
```

#### Tabla: `usuarios_plaza`

Almacena los usuarios del sistema Plaza.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT PRIMARY KEY AUTO_INCREMENT | ID único del usuario |
| `email` | VARCHAR(255) UNIQUE | Email del usuario (único) |
| `username` | VARCHAR(100) UNIQUE | Nombre de usuario (único, opcional) |
| `nombre` | VARCHAR(255) | Nombre completo del usuario |
| `password_hash` | VARCHAR(255) | Hash de la contraseña (password_hash PHP) |
| `tienda_id` | INT | ID de la tienda asignada (FK a `tiendas.id`) |
| `activa` | TINYINT(1) DEFAULT 1 | Estado activo/inactivo |
| `is_admin` | TINYINT(1) DEFAULT 0 | Si es administrador de Plaza |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

**Índices:**
- PRIMARY KEY: `id`
- UNIQUE: `email`
- UNIQUE: `username`
- INDEX: `tienda_id`
- INDEX: `activa`

**Relaciones:**
- `tienda_id` → `tiendas.id` (FOREIGN KEY)

**Ejemplo de datos:**
```sql
INSERT INTO usuarios_plaza (email, username, nombre, password_hash, tienda_id, activa, is_admin) 
VALUES (
  'usuario@ejemplo.com',
  'usuario',
  'Juan Pérez',
  '$2y$10$...', -- Hash generado con password_hash()
  1,
  1,
  0
);
```

#### Tabla: `sesiones`

Almacena las sesiones activas de los usuarios.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT PRIMARY KEY AUTO_INCREMENT | ID único de la sesión |
| `usuario_id` | INT | ID del usuario (FK a `usuarios_plaza.id`) |
| `token` | VARCHAR(255) UNIQUE | Token único de la sesión |
| `expires_at` | TIMESTAMP | Fecha de expiración de la sesión |
| `created_at` | TIMESTAMP | Fecha de creación |
| `last_activity` | TIMESTAMP | Última actividad |

**Índices:**
- PRIMARY KEY: `id`
- UNIQUE: `token`
- INDEX: `usuario_id`
- INDEX: `expires_at`

**Relaciones:**
- `usuario_id` → `usuarios_plaza.id` (FOREIGN KEY)

**Ejemplo de datos:**
```sql
INSERT INTO sesiones (usuario_id, token, expires_at) 
VALUES (
  1,
  'd5c61bd429214b60cf1bc482774081cf7808527592b6b7f952c5ea6694858f54',
  DATE_ADD(NOW(), INTERVAL 24 HOUR)
);
```

### Script de Creación de Base de Datos

```sql
-- Crear base de datos
CREATE DATABASE IF NOT EXISTS `tekeclil_plaza` 
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `tekeclil_plaza`;

-- Tabla tiendas
CREATE TABLE IF NOT EXISTS `tiendas` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `wp_user` VARCHAR(100) NOT NULL,
  `app_password_encrypted` TEXT NOT NULL,
  `activa` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `activa` (`activa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla usuarios_plaza
CREATE TABLE IF NOT EXISTS `usuarios_plaza` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `username` VARCHAR(100) DEFAULT NULL UNIQUE,
  `nombre` VARCHAR(255) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `tienda_id` INT(11) NOT NULL,
  `activa` TINYINT(1) DEFAULT 1,
  `is_admin` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `tienda_id` (`tienda_id`),
  KEY `activa` (`activa`),
  CONSTRAINT `fk_usuario_tienda` FOREIGN KEY (`tienda_id`) REFERENCES `tiendas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla sesiones
CREATE TABLE IF NOT EXISTS `sesiones` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` INT(11) NOT NULL,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `usuario_id` (`usuario_id`),
  KEY `expires_at` (`expires_at`),
  CONSTRAINT `fk_sesion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios_plaza` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 📁 Estructura de Archivos

```
plaza-headless/
├── public_html/                          # Archivos del servidor
│   ├── index.html                        # Frontend principal
│   ├── styles.css                        # Estilos CSS
│   ├── app.js                            # Lógica principal de la aplicación
│   ├── auth.js                           # Manejo de autenticación (frontend)
│   ├── api.js                            # Cliente API (frontend)
│   │
│   └── api/                              # Backend PHP
│       ├── config/
│       │   └── database.php              # Configuración de conexión a BD
│       │
│       ├── includes/
│       │   ├── encryption.php            # Funciones de encriptación
│       │   └── auth-check.php            # Verificación de sesiones
│       │
│       ├── api/
│       │   ├── auth.php                  # Endpoint de autenticación
│       │   ├── proxy.php                 # Proxy a WooCommerce API
│       │   └── cambiar-password.php      # Cambio de contraseña
│       │
│       └── admin/                        # Panel de administración
│           ├── index.php                 # Panel principal
│           ├── tiendas.php               # CRUD de tiendas
│           ├── usuarios.php              # CRUD de usuarios
│           ├── diagnostico-tiendas.php   # Diagnóstico de tiendas
│           ├── diagnostico-usuarios.php  # Diagnóstico de usuarios
│           ├── fix-tienda.php            # Corregir tienda específica
│           └── fix-passwords.php         # Corregir contraseñas
│
├── README.md                             # Documentación básica
├── DOCUMENTACION_COMPLETA.md             # Este archivo
├── GUIA_AUTENTICACION.md                 # Guía de autenticación (legacy)
└── INSTRUCCIONES_ENDPOINT.md             # Instrucciones del endpoint (legacy)
```

### Descripción de Archivos Clave

#### Frontend

**`index.html`**
- Página principal SPA
- Contiene login, dashboard, modales
- Carga `auth.js`, `api.js`, `app.js` con versiones para cache busting

**`auth.js`**
- Maneja autenticación contra `/api/api/auth.php`
- Guarda `token`, `usuario`, `tienda` en `localStorage`
- Métodos: `authenticate()`, `checkAuth()`, `logout()`, `getToken()`, `getUsuario()`, `getTienda()`

**`api.js`**
- Cliente para hacer peticiones a WooCommerce a través de `/api/api/proxy.php`
- Todas las peticiones incluyen el `token` en query params
- Métodos: `request()`, `getProducts()`, `getOrders()`, etc.

**`app.js`**
- Lógica principal de la aplicación
- Maneja navegación, eventos, carga de datos
- Inicializa `auth` y `wcAPI` al cargar

#### Backend

**`config/database.php`**
- Configuración PDO para MySQL
- Variables: `$host`, `$dbname`, `$username`, `$password`

**`includes/encryption.php`**
- Funciones `encrypt_credential()` y `decrypt_credential()`
- Usa AES-256-CBC con clave definida en `ENCRYPTION_KEY`
- **IMPORTANTE**: Cambiar `ENCRYPTION_KEY` por una clave segura

**`includes/auth-check.php`**
- Función `verify_session($token)`: Verifica si un token es válido
- Función `clean_expired_sessions()`: Limpia sesiones expiradas

**`api/auth.php`**
- Endpoint POST para login
- Recibe: `{email, password}`
- Retorna: `{success: true, token, usuario, tienda}`
- Valida credenciales, genera token, retorna datos

**`api/proxy.php`**
- Proxy a WooCommerce REST API
- Recibe: `endpoint` (query param), `token` (query param), body (opcional)
- Verifica token, obtiene tienda, desencripta credenciales, hace petición a WooCommerce
- Retorna la respuesta de WooCommerce

**`api/cambiar-password.php`**
- Endpoint POST para cambiar contraseña
- Recibe: `{current_password, new_password}` (y token en query)
- Valida contraseña actual, hashea nueva, actualiza BD

**`admin/tiendas.php`**
- API REST para CRUD de tiendas
- Métodos: GET (listar), POST (crear), PUT (actualizar), DELETE (eliminar)
- Encripta Application Passwords al guardar

**`admin/usuarios.php`**
- API REST para CRUD de usuarios
- Métodos: GET (listar), POST (crear), PUT (actualizar), DELETE (eliminar)
- Hashea contraseñas con `password_hash()`

---

## ⚙️ Configuración Inicial

### Paso 1: Crear Base de Datos

1. Accede a phpMyAdmin
2. Ejecuta el script SQL de creación de tablas (ver sección Base de Datos)
3. Verifica que las tablas se crearon correctamente

### Paso 2: Configurar Base de Datos

Edita `/api/config/database.php`:

```php
$host = 'localhost';
$dbname = 'tekeclil_plaza';        // Tu nombre de BD
$username = 'tekeclil_plaza';      // Tu usuario de BD
$password = 'TuPasswordSeguro';    // Tu contraseña de BD
```

### Paso 3: Configurar Clave de Encriptación

**⚠️ CRÍTICO**: Cambia la clave de encriptación antes de usar en producción.

Edita `/api/includes/encryption.php`:

```php
define('ENCRYPTION_KEY', 'TU_CLAVE_SEGURA_DE_32_CARACTERES_MINIMO_AQUI');
```

**Generar una clave segura:**
```bash
# En Linux/Mac
openssl rand -base64 32

# O usar un generador online
# https://www.random.org/strings/
```

**⚠️ IMPORTANTE**: 
- Si cambias la clave después de guardar Application Passwords, NO podrás desencriptarlos
- Guarda esta clave en un lugar seguro
- No la subas a Git

### Paso 4: Configurar Estructura en Hosting

**Estructura recomendada:**
```
plaza.narkan.cl/
└── public_html/
    ├── index.html
    ├── styles.css
    ├── app.js
    ├── auth.js
    ├── api.js
    └── api/
        └── ... (todos los archivos PHP)
```

**Permisos:**
- Archivos PHP: `644`
- Directorios: `755`

### Paso 5: Configurar CORS (si es necesario)

Si el frontend está en un dominio diferente al backend, configura CORS en los archivos PHP:

```php
header('Access-Control-Allow-Origin: https://plaza.narkan.cl');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
```

---

## 🔐 Sistema de Autenticación

### Flujo de Login

1. **Usuario ingresa credenciales** en el frontend
2. **Frontend envía POST** a `/api/api/auth.php`:
   ```json
   {
     "email": "usuario@ejemplo.com",
     "password": "contraseña"
   }
   ```
3. **Backend verifica**:
   - Busca usuario por `email` o `username` en `usuarios_plaza`
   - Verifica que usuario y tienda estén activos
   - Verifica contraseña con `password_verify()`
4. **Backend genera token**:
   - Token aleatorio de 64 caracteres
   - Expiración: 24 horas desde ahora
   - Guarda en tabla `sesiones`
5. **Backend retorna**:
   ```json
   {
     "success": true,
     "token": "d5c61bd429214b60cf1bc482774081cf...",
     "usuario": {
       "id": 1,
       "email": "usuario@ejemplo.com",
       "nombre": "Juan Pérez",
       "is_admin": 0
     },
     "tienda": {
       "id": 1,
       "nombre": "Mi Tienda",
       "url": "https://mitienda.com"
     }
   }
   ```
6. **Frontend guarda** en `localStorage`:
   - `plaza_token`
   - `plaza_usuario`
   - `plaza_tienda`

### Uso del Token

Todas las peticiones a `/api/api/proxy.php` incluyen el token:

```
GET /api/api/proxy.php?endpoint=/products&token=d5c61bd429214b60cf1bc482...
```

El backend:
1. Verifica el token en `sesiones`
2. Obtiene el `usuario_id`
3. Obtiene la `tienda_id` del usuario
4. Obtiene las credenciales de la tienda
5. Desencripta el Application Password
6. Hace la petición a WooCommerce con Basic Auth

### Expiración de Sesión

- Duración: 24 horas
- Se actualiza `last_activity` en cada petición
- Las sesiones expiradas se limpian automáticamente

### Cambio de Contraseña

Endpoint: `/api/api/cambiar-password.php`

Request:
```json
{
  "current_password": "contraseña_actual",
  "new_password": "nueva_contraseña"
}
```

Query params: `?token=...`

El cambio de contraseña:
- Solo afecta la contraseña de Plaza
- NO afecta la contraseña de WordPress
- Se guarda hasheada con `password_hash()`

---

## 🌐 API Endpoints

### Autenticación

#### `POST /api/api/auth.php`

Login de usuario.

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

**Response (éxito):**
```json
{
  "success": true,
  "token": "d5c61bd429214b60cf1bc482...",
  "usuario": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "username": "usuario",
    "nombre": "Juan Pérez",
    "is_admin": 0
  },
  "tienda": {
    "id": 1,
    "nombre": "Mi Tienda",
    "url": "https://mitienda.com"
  }
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Contraseña incorrecta"
}
```

#### `POST /api/api/cambiar-password.php?token=...`

Cambiar contraseña del usuario.

**Request:**
```json
{
  "current_password": "contraseña_actual",
  "new_password": "nueva_contraseña"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

### Proxy a WooCommerce

#### `GET/POST/PUT/DELETE /api/api/proxy.php`

Proxy a WooCommerce REST API.

**Query Params:**
- `endpoint`: Endpoint de WooCommerce (ej: `/products`, `/orders`)
- `token`: Token de sesión
- Otros params se pasan directamente a WooCommerce

**Ejemplo:**
```
GET /api/api/proxy.php?endpoint=/products&per_page=10&token=...
```

**Response:**
Retorna la respuesta directa de WooCommerce API.

**Errores comunes:**
- `401`: Token inválido o expirado
- `500`: Error al desencriptar Application Password
- `500`: Error al conectar con WooCommerce

### Panel de Administración

#### `GET /api/admin/tiendas.php`

Listar todas las tiendas.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Mi Tienda",
      "url": "https://mitienda.com",
      "wp_user": "admin",
      "activa": 1
    }
  ]
}
```

#### `POST /api/admin/tiendas.php`

Crear nueva tienda.

**Request:**
```json
{
  "nombre": "Nueva Tienda",
  "url": "https://nuevatienda.com",
  "wp_user": "admin",
  "app_password": "xxxx xxxx xxxx xxxx xxxx xxxx"
}
```

#### `PUT /api/admin/tiendas.php?id=1`

Actualizar tienda.

**Request:**
```json
{
  "nombre": "Tienda Actualizada",
  "url": "https://tienda.com",
  "wp_user": "admin",
  "app_password": "xxxx xxxx xxxx xxxx xxxx xxxx"
}
```

**Nota:** Si `app_password` es `"***NO_CAMBIAR***"`, no se actualiza.

#### `DELETE /api/admin/tiendas.php?id=1`

Eliminar tienda (solo si no tiene usuarios asignados).

#### `GET /api/admin/usuarios.php`

Listar todos los usuarios.

#### `POST /api/admin/usuarios.php`

Crear nuevo usuario.

**Request:**
```json
{
  "email": "nuevo@ejemplo.com",
  "username": "nuevo",
  "nombre": "Nuevo Usuario",
  "password": "contraseña",
  "tienda_id": 1,
  "activa": 1,
  "is_admin": 0
}
```

#### `PUT /api/admin/usuarios.php?id=1`

Actualizar usuario.

#### `DELETE /api/admin/usuarios.php?id=1`

Eliminar usuario.

---

## 🎛️ Panel de Administración

### Acceso

URL: `https://plaza.narkan.cl/api/admin/`

### Funcionalidades

#### Gestión de Tiendas

1. **Listar tiendas**: Ver todas las tiendas registradas
2. **Crear tienda**: Agregar nueva tienda con:
   - Nombre
   - URL de WooCommerce
   - Usuario de WordPress
   - Application Password (se encripta automáticamente)
3. **Editar tienda**: Modificar datos (Application Password opcional)
4. **Eliminar tienda**: Solo si no tiene usuarios asignados

#### Gestión de Usuarios

1. **Listar usuarios**: Ver todos los usuarios de Plaza
2. **Crear usuario**: Agregar nuevo usuario con:
   - Email (único)
   - Username (único, opcional)
   - Nombre completo
   - Contraseña (se hashea automáticamente)
   - Tienda asignada
   - Estado (activo/inactivo)
   - Rol (admin/usuario normal)
3. **Editar usuario**: Modificar datos
4. **Eliminar usuario**: Eliminar usuario del sistema

#### Herramientas de Diagnóstico

**`diagnostico-tiendas.php`**
- Lista todas las tiendas
- Verifica si tienen WP User
- Verifica si el Application Password se puede desencriptar
- Muestra estado de cada tienda

**`diagnostico-usuarios.php`**
- Lista todos los usuarios
- Verifica password hash
- Verifica estado activo
- Verifica tienda asignada

**`fix-tienda.php`**
- Permite corregir una tienda específica
- Reconfigurar WP User y Application Password
- Verifica que la encriptación funcione

**`fix-passwords.php`**
- Permite corregir contraseñas de usuarios
- Útil si hay problemas con password hashes

---

## 📖 Guías de Uso

### Para Administradores

#### Crear una Nueva Tienda

1. Accede a: `https://plaza.narkan.cl/api/admin/`
2. Ve a "Gestión de Tiendas"
3. Haz clic en "Agregar Tienda"
4. Completa:
   - **Nombre**: Nombre descriptivo (ej: "Tienda Principal")
   - **URL**: URL base de WooCommerce (ej: `https://mitienda.com`)
   - **WP User**: Usuario de WordPress (ej: `admin`)
   - **Application Password**: Obténlo de WordPress:
     - Ve a `Usuarios > Tu Perfil` en WordPress
     - Baja a "Application Passwords"
     - Crea uno nuevo con nombre "Plaza"
     - Copia el password (solo se muestra una vez)
5. Guarda

#### Crear un Usuario

1. Accede a: `https://plaza.narkan.cl/api/admin/`
2. Ve a "Gestión de Usuarios"
3. Haz clic en "Agregar Usuario"
4. Completa:
   - **Email**: Email único del usuario
   - **Username**: Nombre de usuario (opcional, único)
   - **Nombre**: Nombre completo
   - **Contraseña**: Contraseña inicial
   - **Tienda**: Selecciona la tienda asignada
   - **Activo**: Marca si está activo
   - **Admin**: Marca si es administrador
5. Guarda

#### Corregir una Tienda con Problemas

1. Accede a: `https://plaza.narkan.cl/api/admin/diagnostico-tiendas.php`
2. Identifica la tienda con problemas (marca roja ❌)
3. Haz clic en "Editar" o accede directamente: `fix-tienda.php?id=X`
4. Reingresa:
   - WP User (si falta)
   - Application Password (obtén uno nuevo de WordPress si es necesario)
5. Guarda y verifica en el diagnóstico

### Para Usuarios Finales

#### Iniciar Sesión

1. Abre: `https://plaza.narkan.cl/`
2. Ingresa:
   - **Email o Usuario**: El que te asignó el administrador
   - **Contraseña**: La contraseña que te asignó (puedes cambiarla después)
3. Haz clic en "Iniciar Sesión"
4. Serás redirigido automáticamente a tu tienda asignada

#### Cambiar Contraseña

1. Inicia sesión en Plaza
2. Ve a tu perfil (si está implementado) o usa el endpoint directamente
3. Ingresa:
   - Contraseña actual
   - Nueva contraseña
   - Confirma nueva contraseña
4. Guarda

**Nota**: Este cambio solo afecta tu contraseña de Plaza, NO la de WordPress.

#### Usar el Panel

- **Dashboard**: Estadísticas generales de tu tienda
- **Productos**: Gestionar productos de WooCommerce
- **Pedidos**: Ver y gestionar pedidos
- **Clientes**: Ver clientes registrados
- **Reportes**: Ver métricas y gráficos

---

## 🔧 Troubleshooting

### Error: "Usuario no encontrado"

**Causa**: El email/username no existe en `usuarios_plaza`.

**Solución**:
1. Verifica en `diagnostico-usuarios.php` que el usuario existe
2. Verifica que el email/username sea correcto
3. Crea el usuario desde el panel de administración

### Error: "Contraseña incorrecta"

**Causa**: El password hash no coincide.

**Solución**:
1. Usa `fix-passwords.php` para reestablecer la contraseña
2. Verifica que el usuario esté activo

### Error: "Tienda inactiva"

**Causa**: La tienda asignada al usuario está marcada como inactiva.

**Solución**:
1. Ve a "Gestión de Tiendas"
2. Activa la tienda del usuario

### Error: "Error al obtener credenciales de la tienda"

**Causa**: No se puede desencriptar el Application Password.

**Posibles causas**:
- La `ENCRYPTION_KEY` cambió después de guardar el password
- El Application Password se guardó incorrectamente
- El formato de encriptación es inválido

**Solución**:
1. Abre `diagnostico-tiendas.php` y verifica qué tienda tiene el problema
2. Usa `fix-tienda.php?id=X` para reconfigurar el Application Password
3. Obtén un nuevo Application Password de WordPress
4. Reingrésalo en el formulario

### Error: "No se pudo desencriptar"

**Causa**: Problema con la encriptación.

**Solución**:
1. Verifica que `ENCRYPTION_KEY` en `encryption.php` sea correcta
2. **⚠️ IMPORTANTE**: Si cambias la clave, todos los Application Passwords guardados dejarán de funcionar
3. Reconfigura todas las tiendas con nuevos Application Passwords

### Error: "Falta WP User"

**Causa**: La tienda no tiene `wp_user` configurado.

**Solución**:
1. Ve a `fix-tienda.php?id=X`
2. Ingresa el WP User de la tienda
3. Guarda

### Error 500 en `proxy.php`

**Causas comunes**:
1. Application Password no se puede desencriptar
2. Tienda no encontrada
3. Error de conexión a WooCommerce
4. Error de conexión a la base de datos

**Solución**:
1. Revisa los logs de PHP del servidor
2. Usa `diagnostico-tiendas.php` para verificar la tienda
3. Verifica que la URL de WooCommerce sea correcta
4. Verifica que el Application Password sea válido

### Error: "Sesión expirada"

**Causa**: El token expiró (24 horas).

**Solución**:
1. El usuario debe iniciar sesión nuevamente
2. Verifica que `clean_expired_sessions()` se ejecute periódicamente

### El frontend no carga los archivos actualizados

**Causa**: Cache del navegador.

**Solución**:
1. Los archivos JS/CSS tienen versiones en `index.html`: `?v=3.0`
2. Incrementa la versión en `index.html` para forzar recarga
3. O haz hard refresh: `Ctrl+Shift+R` (Windows/Linux) o `Cmd+Shift+R` (Mac)

### Error: "wcAPI is not defined"

**Causa**: `api.js` no se cargó correctamente.

**Solución**:
1. Verifica que `api.js` esté en el servidor
2. Verifica la consola del navegador para errores de sintaxis
3. Verifica que el orden de carga en `index.html` sea correcto: `auth.js`, `api.js`, `app.js`

---

## 📊 Estado Actual

### ✅ Implementado

#### Sistema de Autenticación
- [x] Login con credenciales de Plaza
- [x] Sistema de tokens de sesión
- [x] Asignación de tienda por usuario
- [x] Cambio de contraseñas
- [x] Expiración de sesiones (24 horas)
- [x] Limpieza automática de sesiones expiradas

#### Base de Datos
- [x] Tabla `tiendas` con encriptación de Application Passwords
- [x] Tabla `usuarios_plaza` con password hashing
- [x] Tabla `sesiones` con tokens
- [x] Relaciones y foreign keys

#### Backend PHP
- [x] Endpoint de autenticación (`auth.php`)
- [x] Proxy a WooCommerce (`proxy.php`)
- [x] Encriptación/desencriptación AES-256-CBC
- [x] Verificación de sesiones
- [x] Endpoint de cambio de contraseña

#### Panel de Administración
- [x] Gestión de tiendas (CRUD)
- [x] Gestión de usuarios (CRUD)
- [x] Diagnóstico de tiendas
- [x] Diagnóstico de usuarios
- [x] Herramienta para corregir tiendas
- [x] Herramienta para corregir contraseñas

#### Frontend
- [x] Login simplificado (solo email/username y contraseña)
- [x] Almacenamiento de token, usuario y tienda en localStorage
- [x] Peticiones a través del proxy
- [x] Manejo de errores de autenticación
- [x] Redirección automática al login si token expira

#### Funcionalidades WooCommerce
- [x] Dashboard con estadísticas
- [x] Gestión de productos
- [x] Gestión de pedidos
- [x] Gestión de clientes
- [x] Reportes
- [x] Gestión de envíos (solo admin)

### 🚧 Pendiente

#### Seguridad
- [ ] Implementar HTTPS obligatorio
- [ ] Rate limiting en endpoints
- [ ] Validación más estricta de inputs
- [ ] Logs de auditoría
- [ ] Protección CSRF

#### Panel de Administración
- [ ] Login para panel de admin
- [ ] Permisos granulares
- [ ] Historial de cambios
- [ ] Exportar/importar configuraciones

#### Frontend
- [ ] Perfil de usuario
- [ ] Cambio de contraseña desde UI
- [ ] Notificaciones en tiempo real
- [ ] Modo oscuro
- [ ] Multi-idioma

#### Funcionalidades
- [ ] Gestión de variaciones de productos
- [ ] Gestión de atributos
- [ ] Gestión de categorías y etiquetas
- [ ] Edición completa de pedidos
- [ ] Notas en pedidos
- [ ] Envío de emails desde Plaza

### 🐛 Problemas Conocidos

1. **Cache del navegador**: A veces los archivos JS no se actualizan. Solución: Incrementar versión en `index.html`.
2. **Application Passwords**: Si se cambia `ENCRYPTION_KEY`, todos los passwords guardados dejan de funcionar. Solución: Reconfigurar todas las tiendas.
3. **Sesiones expiradas**: No hay renovación automática de tokens. Solución: Usuario debe hacer login nuevamente.

---

## 🔒 Consideraciones de Seguridad

### ⚠️ IMPORTANTE

1. **Clave de Encriptación**: 
   - Cambia `ENCRYPTION_KEY` antes de usar en producción
   - Guárdala en un lugar seguro
   - No la subas a Git

2. **Credenciales de Base de Datos**:
   - No subas `database.php` a repositorios públicos
   - Usa variables de entorno si es posible

3. **HTTPS**:
   - Usa HTTPS en producción
   - Los tokens se transmiten en texto plano (aunque en query params)

4. **Application Passwords**:
   - Se almacenan encriptados en la BD
   - Solo se desencriptan cuando se usa el proxy
   - Nunca se envían al frontend

5. **Password Hashing**:
   - Se usa `password_hash()` de PHP (bcrypt)
   - Nunca se almacenan contraseñas en texto plano

6. **Sesiones**:
   - Tokens de 64 caracteres aleatorios
   - Expiran en 24 horas
   - Se limpian automáticamente

---

## 📞 Soporte y Mantenimiento

### Verificar Estado del Sistema

1. **Diagnóstico de Tiendas**: `https://plaza.narkan.cl/api/admin/diagnostico-tiendas.php`
2. **Diagnóstico de Usuarios**: `https://plaza.narkan.cl/api/admin/diagnostico-usuarios.php`
3. **Logs del Servidor**: Revisa los logs de PHP del hosting

### Mantenimiento Regular

1. **Limpieza de Sesiones**: Las sesiones expiradas se limpian automáticamente, pero puedes ejecutar manualmente:
   ```php
   clean_expired_sessions();
   ```

2. **Backup de Base de Datos**: Haz backup regular de:
   - Tabla `tiendas` (contiene Application Passwords encriptados)
   - Tabla `usuarios_plaza`
   - Tabla `sesiones` (opcional, se puede regenerar)

3. **Verificación de Tiendas**: Revisa periódicamente que las tiendas sigan activas y funcionando.

---

## 📝 Notas Finales

- Este sistema está diseñado para un entorno de hosting compartido con PHP y MySQL
- El frontend puede estar en el mismo dominio o en uno diferente (con CORS configurado)
- Los Application Passwords de WordPress son específicos por usuario, asegúrate de usar el correcto
- Si necesitas soporte para múltiples tiendas por usuario, se requiere modificar la estructura de BD

---

**Última actualización**: Diciembre 2024  
**Versión del sistema**: 3.0  
**Autor**: Sistema Plaza Headless

