<?php
/**
 * Script para corregir contraseñas de usuarios
 * Acceder desde: https://plaza.narkan.cl/api/admin/fix-passwords.php
 * 
 * IMPORTANTE: Este script actualiza las contraseñas de los usuarios de prueba
 * con el valor que especifiques. Úsalo solo para usuarios de prueba.
 */

require_once __DIR__ . '/../config/database.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Corregir Contraseñas de Usuarios</h1>";
echo "<style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; max-width: 800px; margin: 0 auto; }
    .form-group { margin: 15px 0; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    button { background: #4CAF50; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    button:hover { background: #45a049; }
    .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; margin: 15px 0; }
    table { border-collapse: collapse; width: 100%; background: white; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #4CAF50; color: white; }
</style>";

// Procesar formulario
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario_id = $_POST['usuario_id'] ?? 0;
    $nueva_password = $_POST['nueva_password'] ?? '';
    
    if (empty($nueva_password) || strlen($nueva_password) < 6) {
        echo "<div class='error'>La contraseña debe tener al menos 6 caracteres</div>";
    } else {
        try {
            $password_hash = password_hash($nueva_password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("
                UPDATE usuarios_plaza 
                SET password_hash = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$password_hash, $usuario_id]);
            
            echo "<div class='success'>✅ Contraseña actualizada correctamente para el usuario ID: $usuario_id</div>";
        } catch (PDOException $e) {
            echo "<div class='error'>Error: " . htmlspecialchars($e->getMessage()) . "</div>";
        }
    }
}

try {
    // Listar usuarios
    $stmt = $pdo->query("
        SELECT u.*, t.nombre as tienda_nombre
        FROM usuarios_plaza u
        LEFT JOIN tiendas t ON u.tienda_id = t.id
        ORDER BY u.id
    ");
    $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<div class='warning'>⚠️ <strong>Advertencia:</strong> Este script actualiza contraseñas. Úsalo solo para usuarios de prueba.</div>";
    
    echo "<h2>Actualizar Contraseña</h2>";
    echo "<form method='POST'>";
    echo "<div class='form-group'>";
    echo "<label>Seleccionar Usuario:</label>";
    echo "<select name='usuario_id' required>";
    echo "<option value=''>-- Selecciona un usuario --</option>";
    foreach ($usuarios as $usuario) {
        $label = htmlspecialchars($usuario['email'] . " (" . ($usuario['nombre'] ?? $usuario['username'] ?? 'Sin nombre') . ")");
        echo "<option value='" . $usuario['id'] . "'>" . $label . "</option>";
    }
    echo "</select>";
    echo "</div>";
    
    echo "<div class='form-group'>";
    echo "<label>Nueva Contraseña (mínimo 6 caracteres):</label>";
    echo "<input type='password' name='nueva_password' required minlength='6' placeholder='Ingresa la nueva contraseña'>";
    echo "</div>";
    
    echo "<button type='submit'>Actualizar Contraseña</button>";
    echo "</form>";
    
    echo "<hr>";
    echo "<h2>Lista de Usuarios</h2>";
    echo "<table>";
    echo "<tr><th>ID</th><th>Email</th><th>Username</th><th>Nombre</th><th>Tienda</th><th>Estado Hash</th></tr>";
    
    foreach ($usuarios as $usuario) {
        $password_hash = $usuario['password_hash'];
        $hash_length = strlen($password_hash);
        $is_bcrypt = strpos($password_hash, '$2y$') === 0 || strpos($password_hash, '$2a$') === 0;
        $hash_ok = strlen($password_hash) >= 60 && $is_bcrypt;
        
        $estado = $hash_ok ? '✅ Válido' : '❌ Inválido';
        
        echo "<tr>";
        echo "<td>" . htmlspecialchars($usuario['id']) . "</td>";
        echo "<td>" . htmlspecialchars($usuario['email']) . "</td>";
        echo "<td>" . htmlspecialchars($usuario['username'] ?? '') . "</td>";
        echo "<td>" . htmlspecialchars($usuario['nombre'] ?? '') . "</td>";
        echo "<td>" . htmlspecialchars($usuario['tienda_nombre'] ?? 'Sin tienda') . "</td>";
        echo "<td>" . $estado . "</td>";
        echo "</tr>";
    }
    
    echo "</table>";
    
} catch (PDOException $e) {
    echo "<div class='error'>Error: " . htmlspecialchars($e->getMessage()) . "</div>";
}

echo "<hr>";
echo "<p><a href='diagnostico-usuarios.php'>🔍 Volver a diagnóstico</a></p>";

