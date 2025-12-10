<?php
/**
 * API para gestión de tiendas (CRUD)
 */

// Habilitar reporte de errores para debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar en producción, solo en logs
ini_set('log_errors', 1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/encryption.php';

header('Content-Type: application/json');

// Por ahora sin autenticación de admin (agregar después)
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'listar':
            $stmt = $pdo->query("SELECT * FROM tiendas ORDER BY id DESC");
            $tiendas = $stmt->fetchAll();
            echo json_encode(['success' => true, 'tiendas' => $tiendas]);
            break;
            
        case 'obtener':
            $id = $_GET['id'] ?? 0;
            $stmt = $pdo->prepare("SELECT * FROM tiendas WHERE id = ?");
            $stmt->execute([$id]);
            $tienda = $stmt->fetch();
            
            if ($tienda) {
                // No desencriptar el password, solo mostrar que existe
                $tienda['app_password_encrypted'] = '***ENCRYPTED***';
                echo json_encode(['success' => true, 'tienda' => $tienda]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Tienda no encontrada']);
            }
            break;
            
        case 'eliminar':
            $id = $_GET['id'] ?? 0;
            
            // Verificar si hay usuarios asociados
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios_plaza WHERE tienda_id = ?");
            $stmt->execute([$id]);
            $count = $stmt->fetchColumn();
            
            if ($count > 0) {
                echo json_encode(['success' => false, 'error' => 'No se puede eliminar: hay usuarios asociados']);
                break;
            }
            
            $stmt = $pdo->prepare("DELETE FROM tiendas WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
            
        default:
            // Crear o actualizar
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                echo json_encode(['success' => false, 'error' => 'Datos inválidos. No se recibió JSON válido.']);
                break;
            }
            
            $id = isset($input['id']) && $input['id'] > 0 ? intval($input['id']) : 0;
            $nombre = trim($input['nombre'] ?? '');
            $url = trim($input['url'] ?? '');
            $wp_user = trim($input['wp_user'] ?? '');
            $app_password = trim($input['app_password'] ?? '');
            
            // Remover espacios del Application Password
            $app_password = str_replace(' ', '', $app_password);
            
            if (empty($nombre) || empty($url) || empty($wp_user)) {
                echo json_encode(['success' => false, 'error' => 'Campos requeridos faltantes: nombre, url y wp_user son obligatorios']);
                break;
            }
            
            // Limpiar URL
            $url = rtrim($url, '/');
            
            if ($id > 0) {
                // Actualizar
                if (!empty($app_password) && $app_password !== '***NO_CAMBIAR***') {
                    $app_password_encrypted = encrypt_credential($app_password);
                    if ($app_password_encrypted === false) {
                        echo json_encode(['success' => false, 'error' => 'Error al encriptar Application Password']);
                        break;
                    }
                    $stmt = $pdo->prepare("
                        UPDATE tiendas 
                        SET nombre = ?, url = ?, wp_user = ?, app_password_encrypted = ?, updated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([$nombre, $url, $wp_user, $app_password_encrypted, $id]);
                } else {
                    $stmt = $pdo->prepare("
                        UPDATE tiendas 
                        SET nombre = ?, url = ?, wp_user = ?, updated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([$nombre, $url, $wp_user, $id]);
                }
            } else {
                // Crear
                if (empty($app_password)) {
                    echo json_encode(['success' => false, 'error' => 'Application Password es requerido para nuevas tiendas']);
                    break;
                }
                
                $app_password_encrypted = encrypt_credential($app_password);
                if ($app_password_encrypted === false) {
                    echo json_encode(['success' => false, 'error' => 'Error al encriptar Application Password']);
                    break;
                }
                
                $stmt = $pdo->prepare("
                    INSERT INTO tiendas (nombre, url, wp_user, app_password_encrypted) 
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([$nombre, $url, $wp_user, $app_password_encrypted]);
            }
            
            echo json_encode(['success' => true, 'message' => $id > 0 ? 'Tienda actualizada exitosamente' : 'Tienda creada exitosamente']);
            break;
    }
} catch (PDOException $e) {
    error_log("Error en tiendas.php (PDO): " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Error interno del servidor',
        'debug' => $e->getMessage() // Solo para debugging, quitar en producción
    ]);
} catch (Exception $e) {
    error_log("Error en tiendas.php (General): " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Error interno del servidor: ' . $e->getMessage(),
        'debug' => $e->getMessage() // Solo para debugging, quitar en producción
    ]);
}

