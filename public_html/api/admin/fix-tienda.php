<?php
/**
 * Script para corregir una tienda específica
 * Permite reconfigurar Application Password y WP User
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/encryption.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Corregir Tienda</h1>";
echo "<style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; max-width: 800px; margin: 0 auto; }
    .form-group { margin: 15px 0; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
    button { background: #4CAF50; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    button:hover { background: #45a049; }
    .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .info { background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 4px; margin: 15px 0; }
    table { border-collapse: collapse; width: 100%; background: white; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #4CAF50; color: white; }
    .ok { color: green; }
    .error-text { color: red; }
</style>";

// Procesar formulario
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $tienda_id = $_POST['tienda_id'] ?? 0;
    $wp_user = trim($_POST['wp_user'] ?? '');
    $app_password = trim($_POST['app_password'] ?? '');
    
    if ($tienda_id <= 0) {
        echo "<div class='error'>ID de tienda inválido</div>";
    } elseif (empty($wp_user)) {
        echo "<div class='error'>WP User es requerido</div>";
    } elseif (empty($app_password)) {
        echo "<div class='error'>Application Password es requerido</div>";
    } else {
        try {
            // Remover espacios del Application Password
            $app_password = str_replace(' ', '', $app_password);
            
            // Verificar que la tienda existe
            $stmt = $pdo->prepare("SELECT * FROM tiendas WHERE id = ?");
            $stmt->execute([$tienda_id]);
            $tienda = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$tienda) {
                echo "<div class='error'>Tienda no encontrada</div>";
            } else {
                // Encriptar Application Password
                $app_password_encrypted = encrypt_credential($app_password);
                
                if (!$app_password_encrypted) {
                    echo "<div class='error'>Error al encriptar Application Password</div>";
                } else {
                    // Actualizar tienda
                    $stmt = $pdo->prepare("
                        UPDATE tiendas 
                        SET wp_user = ?, app_password_encrypted = ?, updated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([$wp_user, $app_password_encrypted, $tienda_id]);
                    
                    // Verificar que se desencripta correctamente
                    $test_decrypt = decrypt_credential($app_password_encrypted);
                    $decrypt_ok = ($test_decrypt === $app_password);
                    
                    if ($decrypt_ok) {
                        echo "<div class='success'>✅ Tienda actualizada correctamente. Application Password verificado.</div>";
                    } else {
                        echo "<div class='warning'>⚠️ Tienda actualizada, pero hay un problema al verificar la desencriptación.</div>";
                    }
                }
            }
        } catch (PDOException $e) {
            echo "<div class='error'>Error: " . htmlspecialchars($e->getMessage()) . "</div>";
        }
    }
}

try {
    // Listar tiendas
    $stmt = $pdo->query("
        SELECT t.*, COUNT(u.id) as total_usuarios
        FROM tiendas t
        LEFT JOIN usuarios_plaza u ON t.id = u.tienda_id
        GROUP BY t.id
        ORDER BY t.id
    ");
    $tiendas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener tienda seleccionada
    $tienda_seleccionada = null;
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM tiendas WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        $tienda_seleccionada = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    echo "<div class='info'>ℹ️ <strong>Instrucciones:</strong> Selecciona una tienda y reconfigura su WP User y Application Password. El Application Password debe ser el que obtuviste de WordPress (sin espacios).</div>";
    
    echo "<h2>Seleccionar Tienda</h2>";
    echo "<table>";
    echo "<tr><th>ID</th><th>Nombre</th><th>URL</th><th>WP User</th><th>Estado</th><th>Acción</th></tr>";
    
    foreach ($tiendas as $tienda) {
        $has_wp_user = !empty($tienda['wp_user']);
        $app_password_ok = false;
        
        if (!empty($tienda['app_password_encrypted'])) {
            $test = decrypt_credential($tienda['app_password_encrypted']);
            $app_password_ok = ($test !== false && !empty($test));
        }
        
        $estado = '';
        if (!$has_wp_user) {
            $estado = '<span class="error-text">❌ Falta WP User</span>';
        } elseif (!$app_password_ok) {
            $estado = '<span class="error-text">❌ App Password inválido</span>';
        } else {
            $estado = '<span class="ok">✅ OK</span>';
        }
        
        $selected_class = ($tienda_seleccionada && $tienda_seleccionada['id'] == $tienda['id']) ? ' style="background: #e8f5e9;"' : '';
        
        echo "<tr$selected_class>";
        echo "<td>" . htmlspecialchars($tienda['id']) . "</td>";
        echo "<td>" . htmlspecialchars($tienda['nombre']) . "</td>";
        echo "<td>" . htmlspecialchars($tienda['url']) . "</td>";
        echo "<td>" . htmlspecialchars($tienda['wp_user'] ?? '') . "</td>";
        echo "<td>" . $estado . "</td>";
        echo "<td><a href='?id=" . $tienda['id'] . "'>Editar</a></td>";
        echo "</tr>";
    }
    
    echo "</table>";
    
    if ($tienda_seleccionada) {
        echo "<hr>";
        echo "<h2>Corregir Tienda: " . htmlspecialchars($tienda_seleccionada['nombre']) . "</h2>";
        
        $app_password_decrypted = '';
        if (!empty($tienda_seleccionada['app_password_encrypted'])) {
            $test = decrypt_credential($tienda_seleccionada['app_password_encrypted']);
            if ($test !== false) {
                $app_password_decrypted = $test;
            }
        }
        
        echo "<form method='POST'>";
        echo "<input type='hidden' name='tienda_id' value='" . htmlspecialchars($tienda_seleccionada['id']) . "'>";
        
        echo "<div class='form-group'>";
        echo "<label>WP User (Usuario de WordPress): *</label>";
        echo "<input type='text' name='wp_user' value='" . htmlspecialchars($tienda_seleccionada['wp_user'] ?? '') . "' required placeholder='admin'>";
        echo "<small>El nombre de usuario de WordPress para esta tienda</small>";
        echo "</div>";
        
        echo "<div class='form-group'>";
        echo "<label>Application Password: *</label>";
        echo "<input type='text' name='app_password' required placeholder='xxxx xxxx xxxx xxxx xxxx xxxx' autocomplete='off'>";
        if ($app_password_decrypted) {
            echo "<small style='color: green;'>✅ Password actual se puede desencriptar (longitud: " . strlen($app_password_decrypted) . " chars)</small>";
        } else {
            echo "<small style='color: red;'>❌ Password actual NO se puede desencriptar. Necesitas reingresarlo.</small>";
        }
        echo "<small style='display: block; margin-top: 5px;'>Pega aquí el Application Password de WordPress (sin espacios o con espacios, se limpiarán automáticamente)</small>";
        echo "</div>";
        
        echo "<button type='submit'>Actualizar Tienda</button>";
        echo "</form>";
    }
    
} catch (PDOException $e) {
    echo "<div class='error'>Error: " . htmlspecialchars($e->getMessage()) . "</div>";
}

echo "<hr>";
echo "<p><a href='diagnostico-tiendas.php'>🔍 Volver a diagnóstico</a> | <a href='index.php'>🏠 Panel de administración</a></p>";

