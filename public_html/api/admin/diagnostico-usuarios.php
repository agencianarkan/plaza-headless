<?php
/**
 * Script de diagnóstico - Verificar usuarios y contraseñas
 * Acceder desde: https://plaza.narkan.cl/api/admin/diagnostico-usuarios.php
 */

require_once __DIR__ . '/../config/database.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Diagnóstico de Usuarios</h1>";
echo "<style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    table { border-collapse: collapse; width: 100%; background: white; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #4CAF50; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .error { color: red; }
    .ok { color: green; }
    .warning { color: orange; }
</style>";

try {
    // Listar todos los usuarios
    $stmt = $pdo->query("
        SELECT u.*, t.nombre as tienda_nombre, t.activa as tienda_activa
        FROM usuarios_plaza u
        LEFT JOIN tiendas t ON u.tienda_id = t.id
        ORDER BY u.id
    ");
    $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h2>Usuarios en la base de datos (" . count($usuarios) . ")</h2>";
    echo "<table>";
    echo "<tr>
        <th>ID</th>
        <th>Email</th>
        <th>Username</th>
        <th>Nombre</th>
        <th>Tienda</th>
        <th>Activo</th>
        <th>Tienda Activa</th>
        <th>Password Hash</th>
        <th>Estado</th>
    </tr>";
    
    foreach ($usuarios as $usuario) {
        $password_hash = $usuario['password_hash'];
        $hash_length = strlen($password_hash);
        $is_bcrypt = strpos($password_hash, '$2y$') === 0 || strpos($password_hash, '$2a$') === 0;
        
        $estado = '';
        if (empty($password_hash)) {
            $estado = '<span class="error">❌ Sin contraseña</span>';
        } elseif ($hash_length < 60 || !$is_bcrypt) {
            $estado = '<span class="error">❌ Hash inválido (texto plano?)</span>';
        } else {
            $estado = '<span class="ok">✅ Hash válido</span>';
        }
        
        $activo = $usuario['activa'] ? '<span class="ok">✅</span>' : '<span class="error">❌</span>';
        $tienda_activa = $usuario['tienda_activa'] ? '<span class="ok">✅</span>' : '<span class="error">❌</span>';
        
        echo "<tr>";
        echo "<td>" . htmlspecialchars($usuario['id']) . "</td>";
        echo "<td>" . htmlspecialchars($usuario['email']) . "</td>";
        echo "<td>" . htmlspecialchars($usuario['username'] ?? '') . "</td>";
        echo "<td>" . htmlspecialchars($usuario['nombre'] ?? '') . "</td>";
        echo "<td>" . htmlspecialchars($usuario['tienda_nombre'] ?? 'Sin tienda') . "</td>";
        echo "<td>" . $activo . "</td>";
        echo "<td>" . $tienda_activa . "</td>";
        echo "<td>" . htmlspecialchars(substr($password_hash, 0, 30)) . "... (" . $hash_length . " chars)</td>";
        echo "<td>" . $estado . "</td>";
        echo "</tr>";
    }
    
    echo "</table>";
    
    // Verificar usuarios que pueden hacer login
    echo "<h2>Usuarios que pueden hacer login</h2>";
    $stmt = $pdo->query("
        SELECT u.*, t.nombre as tienda_nombre
        FROM usuarios_plaza u
        INNER JOIN tiendas t ON u.tienda_id = t.id
        WHERE u.activa = 1 AND t.activa = 1
    ");
    $usuarios_validos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($usuarios_validos) > 0) {
        echo "<table>";
        echo "<tr><th>Email</th><th>Username</th><th>Tienda</th><th>Estado Hash</th></tr>";
        foreach ($usuarios_validos as $usuario) {
            $password_hash = $usuario['password_hash'];
            $is_bcrypt = strpos($password_hash, '$2y$') === 0 || strpos($password_hash, '$2a$') === 0;
            $hash_ok = strlen($password_hash) >= 60 && $is_bcrypt;
            
            echo "<tr>";
            echo "<td>" . htmlspecialchars($usuario['email']) . "</td>";
            echo "<td>" . htmlspecialchars($usuario['username'] ?? '') . "</td>";
            echo "<td>" . htmlspecialchars($usuario['tienda_nombre']) . "</td>";
            echo "<td>" . ($hash_ok ? '<span class="ok">✅</span>' : '<span class="error">❌</span>') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p class='error'>No hay usuarios válidos para login (activos con tienda activa)</p>";
    }
    
} catch (PDOException $e) {
    echo "<p class='error'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}

echo "<hr>";
echo "<p><a href='fix-passwords.php'>🔧 Ir a script para corregir contraseñas</a></p>";

