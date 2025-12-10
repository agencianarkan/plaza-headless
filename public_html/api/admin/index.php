<?php
/**
 * Panel de Administración - Plaza
 * Gestión de tiendas y usuarios
 */

// Por ahora, acceso simple (luego puedes agregar autenticación de admin)
session_start();

// Si no hay sesión de admin, redirigir a login
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    // Por ahora permitir acceso directo, luego agregar login
    // header('Location: login.php');
    // exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/encryption.php';

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel Admin - Plaza</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 10px;
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 16px;
            color: #6b7280;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
        }
        .tab.active {
            color: #4f46e5;
            border-bottom-color: #4f46e5;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
        }
        .btn-primary {
            background: #4f46e5;
            color: white;
        }
        .btn-primary:hover {
            background: #4338ca;
        }
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #f9fafb;
            font-weight: 600;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        .modal.active {
            display: flex;
        }
        .modal-content {
            background: white;
            padding: 30px;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
        }
        .alert {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .alert-success {
            background: #d1fae5;
            color: #065f46;
        }
        .alert-error {
            background: #fee2e2;
            color: #991b1b;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛍️ Panel de Administración - Plaza</h1>
        
        <div class="tabs">
            <button class="tab active" onclick="showTab('tiendas')">Tiendas</button>
            <button class="tab" onclick="showTab('usuarios')">Usuarios</button>
        </div>
        
        <!-- Tab Tiendas -->
        <div id="tiendas-tab" class="tab-content active">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Gestión de Tiendas</h2>
                <button class="btn btn-primary" onclick="abrirModalTienda()">➕ Nueva Tienda</button>
            </div>
            <div id="tiendas-list">
                <p>Cargando tiendas...</p>
            </div>
        </div>
        
        <!-- Tab Usuarios -->
        <div id="usuarios-tab" class="tab-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Gestión de Usuarios</h2>
                <button class="btn btn-primary" onclick="abrirModalUsuario()">➕ Nuevo Usuario</button>
            </div>
            <div id="usuarios-list">
                <p>Cargando usuarios...</p>
            </div>
        </div>
    </div>
    
    <!-- Modal Tienda -->
    <div id="modal-tienda" class="modal">
        <div class="modal-content">
            <h3 id="modal-tienda-title">Nueva Tienda</h3>
            <form id="form-tienda" onsubmit="guardarTienda(event)">
                <input type="hidden" id="tienda-id" name="id">
                <div class="form-group">
                    <label>Nombre de la Tienda *</label>
                    <input type="text" id="tienda-nombre" name="nombre" required>
                </div>
                <div class="form-group">
                    <label>URL de WooCommerce *</label>
                    <input type="url" id="tienda-url" name="url" placeholder="https://mitienda.com" required>
                </div>
                <div class="form-group">
                    <label>Usuario de WordPress *</label>
                    <input type="text" id="tienda-wp-user" name="wp_user" required>
                </div>
                <div class="form-group">
                    <label>Application Password *</label>
                    <input type="text" id="tienda-app-password" name="app_password" required>
                    <small style="color: #6b7280; font-size: 12px;">Application Password de WordPress (sin espacios)</small>
                </div>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn" onclick="cerrarModalTienda()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Modal Usuario -->
    <div id="modal-usuario" class="modal">
        <div class="modal-content">
            <h3 id="modal-usuario-title">Nuevo Usuario</h3>
            <form id="form-usuario" onsubmit="guardarUsuario(event)">
                <input type="hidden" id="usuario-id" name="id">
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" id="usuario-email" name="email" required>
                </div>
                <div class="form-group">
                    <label>Username (opcional)</label>
                    <input type="text" id="usuario-username" name="username">
                </div>
                <div class="form-group">
                    <label>Nombre Completo</label>
                    <input type="text" id="usuario-nombre" name="nombre">
                </div>
                <div class="form-group">
                    <label>Contraseña *</label>
                    <input type="password" id="usuario-password" name="password">
                    <small style="color: #6b7280; font-size: 12px;">Dejar vacío si no quieres cambiarla (al editar)</small>
                </div>
                <div class="form-group">
                    <label>Tienda Asignada *</label>
                    <select id="usuario-tienda" name="tienda_id" required>
                        <option value="">Seleccionar tienda...</option>
                    </select>
                </div>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn" onclick="cerrarModalUsuario()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        // Funciones de tabs
        function showTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tab + '-tab').classList.add('active');
            
            if (tab === 'tiendas') {
                cargarTiendas();
            } else {
                cargarUsuarios();
            }
        }
        
        // Cargar tiendas
        function cargarTiendas() {
            fetch('tiendas.php?action=listar')
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        let html = '<table><tr><th>ID</th><th>Nombre</th><th>URL</th><th>Estado</th><th>Acciones</th></tr>';
                        data.tiendas.forEach(t => {
                            html += `<tr>
                                <td>${t.id}</td>
                                <td>${t.nombre}</td>
                                <td>${t.url}</td>
                                <td>${t.activa ? '✅ Activa' : '❌ Inactiva'}</td>
                                <td>
                                    <button class="btn btn-primary" onclick="editarTienda(${t.id})">Editar</button>
                                    <button class="btn btn-danger" onclick="eliminarTienda(${t.id})">Eliminar</button>
                                </td>
                            </tr>`;
                        });
                        html += '</table>';
                        document.getElementById('tiendas-list').innerHTML = html;
                    }
                });
        }
        
        // Cargar usuarios
        function cargarUsuarios() {
            fetch('usuarios.php?action=listar')
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        let html = '<table><tr><th>ID</th><th>Email</th><th>Nombre</th><th>Tienda</th><th>Estado</th><th>Acciones</th></tr>';
                        data.usuarios.forEach(u => {
                            html += `<tr>
                                <td>${u.id}</td>
                                <td>${u.email}</td>
                                <td>${u.nombre || '-'}</td>
                                <td>${u.tienda_nombre || '-'}</td>
                                <td>${u.activa ? '✅ Activo' : '❌ Inactivo'}</td>
                                <td>
                                    <button class="btn btn-primary" onclick="editarUsuario(${u.id})">Editar</button>
                                    <button class="btn btn-danger" onclick="eliminarUsuario(${u.id})">Eliminar</button>
                                </td>
                            </tr>`;
                        });
                        html += '</table>';
                        document.getElementById('usuarios-list').innerHTML = html;
                    }
                });
            
            // Cargar tiendas para el select
            fetch('tiendas.php?action=listar')
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        let select = document.getElementById('usuario-tienda');
                        select.innerHTML = '<option value="">Seleccionar tienda...</option>';
                        data.tiendas.forEach(t => {
                            select.innerHTML += `<option value="${t.id}">${t.nombre}</option>`;
                        });
                    }
                });
        }
        
        // Modal Tienda
        function abrirModalTienda() {
            document.getElementById('tienda-id').value = '';
            document.getElementById('form-tienda').reset();
            document.getElementById('modal-tienda-title').textContent = 'Nueva Tienda';
            document.getElementById('modal-tienda').classList.add('active');
        }
        
        function cerrarModalTienda() {
            document.getElementById('modal-tienda').classList.remove('active');
        }
        
        function editarTienda(id) {
            fetch(`tiendas.php?action=obtener&id=${id}`)
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('tienda-id').value = data.tienda.id;
                        document.getElementById('tienda-nombre').value = data.tienda.nombre;
                        document.getElementById('tienda-url').value = data.tienda.url;
                        document.getElementById('tienda-wp-user').value = data.tienda.wp_user;
                        document.getElementById('tienda-app-password').value = '***NO_CAMBIAR***';
                        document.getElementById('modal-tienda-title').textContent = 'Editar Tienda';
                        document.getElementById('modal-tienda').classList.add('active');
                    }
                });
        }
        
        function guardarTienda(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            if (data.app_password === '***NO_CAMBIAR***') {
                delete data.app_password;
            }
            
            fetch('tiendas.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    alert('Tienda guardada exitosamente');
                    cerrarModalTienda();
                    cargarTiendas();
                } else {
                    alert('Error: ' + result.error);
                }
            });
        }
        
        function eliminarTienda(id) {
            if (!confirm('¿Estás seguro de eliminar esta tienda?')) return;
            fetch(`tiendas.php?action=eliminar&id=${id}`, {method: 'POST'})
                .then(r => r.json())
                .then(result => {
                    if (result.success) {
                        alert('Tienda eliminada');
                        cargarTiendas();
                    }
                });
        }
        
        // Modal Usuario
        function abrirModalUsuario() {
            document.getElementById('usuario-id').value = '';
            document.getElementById('form-usuario').reset();
            document.getElementById('usuario-password').required = true;
            document.getElementById('modal-usuario-title').textContent = 'Nuevo Usuario';
            document.getElementById('modal-usuario').classList.add('active');
        }
        
        function cerrarModalUsuario() {
            document.getElementById('modal-usuario').classList.remove('active');
        }
        
        function editarUsuario(id) {
            fetch(`usuarios.php?action=obtener&id=${id}`)
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('usuario-id').value = data.usuario.id;
                        document.getElementById('usuario-email').value = data.usuario.email;
                        document.getElementById('usuario-username').value = data.usuario.username || '';
                        document.getElementById('usuario-nombre').value = data.usuario.nombre || '';
                        document.getElementById('usuario-password').value = '';
                        document.getElementById('usuario-password').required = false;
                        document.getElementById('usuario-tienda').value = data.usuario.tienda_id;
                        document.getElementById('modal-usuario-title').textContent = 'Editar Usuario';
                        document.getElementById('modal-usuario').classList.add('active');
                    }
                });
        }
        
        function guardarUsuario(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            if (!data.password) {
                delete data.password;
            }
            
            fetch('usuarios.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    alert('Usuario guardado exitosamente');
                    cerrarModalUsuario();
                    cargarUsuarios();
                } else {
                    alert('Error: ' + result.error);
                }
            });
        }
        
        function eliminarUsuario(id) {
            if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
            fetch(`usuarios.php?action=eliminar&id=${id}`, {method: 'POST'})
                .then(r => r.json())
                .then(result => {
                    if (result.success) {
                        alert('Usuario eliminado');
                        cargarUsuarios();
                    }
                });
        }
        
        // Cargar al inicio
        cargarTiendas();
    </script>
</body>
</html>

