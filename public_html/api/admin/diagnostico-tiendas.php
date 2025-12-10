<?php
/**
 * Script de diagnóstico - Verificar tiendas y Application Passwords
 * Acceder desde: https://plaza.narkan.cl/api/admin/diagnostico-tiendas.php
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/encryption.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Diagnóstico de Tiendas</h1>";
echo "<style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    table { border-collapse: collapse; width: 100%; background: white; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #4CAF50; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .error { color: red; }
    .ok { color: green; }
    .warning { color: orange; }
    .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; margin: 15px 0; }
</style>";

try {
    // Listar todas las tiendas
    $stmt = $pdo->query("
        SELECT t.*, COUNT(u.id) as total_usuarios
        FROM tiendas t
        LEFT JOIN usuarios_plaza u ON t.id = u.tienda_id
        GROUP BY t.id
        ORDER BY t.id
    ");
    $tiendas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h2>Tiendas en la base de datos (" . count($tiendas) . ")</h2>";
    echo "<table>";
    echo "<tr>
        <th>ID</th>
        <th>Nombre</th>
        <th>URL</th>
        <th>WP User</th>
        <th>Activa</th>
        <th>Usuarios</th>
        <th>App Password</th>
        <th>Estado</th>
    </tr>";
    
    foreach ($tiendas as $tienda) {
        $app_password_hash = $tienda['app_password_encrypted'];
        $hash_length = strlen($app_password_hash);
        $has_app_password = !empty($app_password_hash);
        
        // Intentar desencriptar
        $app_password_decrypted = false;
        $decrypt_error = '';
        
        if ($has_app_password) {
            $app_password_decrypted = decrypt_credential($app_password_hash);
            if ($app_password_decrypted === false) {
                $decrypt_error = '❌ No se pudo desencriptar';
            } else {
                $decrypt_error = '✅ Válido (' . strlen($app_password_decrypted) . ' chars)';
            }
        } else {
            $decrypt_error = '❌ No configurado';
        }
        
        $activa = $tienda['activa'] ? '<span class="ok">✅</span>' : '<span class="error">❌</span>';
        $has_wp_user = !empty($tienda['wp_user']);
        $wp_user_status = $has_wp_user ? '<span class="ok">✅</span>' : '<span class="error">❌ Falta</span>';
        
        $estado_general = ($tienda['activa'] && $has_app_password && $app_password_decrypted !== false && $has_wp_user) 
            ? '<span class="ok">✅ Lista</span>' 
            : '<span class="error">❌ Problemas</span>';
        
        echo "<tr>";
        echo "<td>" . htmlspecialchars($tienda['id']) . "</td>";
        echo "<td>" . htmlspecialchars($tienda['nombre']) . "</td>";
        echo "<td>" . htmlspecialchars($tienda['url']) . "</td>";
        echo "<td>" . htmlspecialchars($tienda['wp_user'] ?? '') . " " . $wp_user_status . "</td>";
        echo "<td>" . $activa . "</td>";
        echo "<td>" . htmlspecialchars($tienda['total_usuarios']) . "</td>";
        echo "<td>" . ($has_app_password ? substr($app_password_hash, 0, 30) . "... (" . $hash_length . " chars)" : 'Vacío') . "</td>";
        echo "<td>" . $decrypt_error . " / " . $estado_general . "</td>";
        echo "</tr>";
    }
    
    echo "</table>";
    
    // Mostrar resumen
    $tiendas_ok = 0;
    $tiendas_problemas = 0;
    
    foreach ($tiendas as $tienda) {
        if ($tienda['activa'] && 
            !empty($tienda['app_password_encrypted']) && 
            decrypt_credential($tienda['app_password_encrypted']) !== false &&
            !empty($tienda['wp_user'])) {
            $tiendas_ok++;
        } else {
            $tiendas_problemas++;
        }
    }
    
    if ($tiendas_problemas > 0) {
        echo "<div class='warning'>⚠️ <strong>Atención:</strong> Hay $tiendas_problemas tienda(s) con problemas. Revisa la tabla arriba.</div>";
    } else {
        echo "<div class='success'>✅ Todas las tiendas están configuradas correctamente.</div>";
    }
    
} catch (PDOException $e) {
    echo "<p class='error'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}

echo "<hr>";
echo "<p><a href='index.php'>🏠 Volver al panel de administración</a></p>";

