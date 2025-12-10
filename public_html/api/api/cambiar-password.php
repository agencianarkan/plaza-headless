<?php
/**
 * API para cambiar contraseña del usuario
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth-check.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo aceptar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Obtener token
$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';
$current_password = $input['current_password'] ?? '';
$new_password = $input['new_password'] ?? '';

// Verificar sesión
$usuario = verify_session($token);

if (!$usuario) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

if (empty($current_password) || empty($new_password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Contraseña actual y nueva son requeridas']);
    exit;
}

if (strlen($new_password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'La nueva contraseña debe tener al menos 6 caracteres']);
    exit;
}

try {
    // Obtener usuario completo
    $stmt = $pdo->prepare("SELECT * FROM usuarios_plaza WHERE id = ?");
    $stmt->execute([$usuario['id']]);
    $usuario_data = $stmt->fetch();
    
    if (!$usuario_data) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado']);
        exit;
    }
    
    // Verificar contraseña actual
    if (!password_verify($current_password, $usuario_data['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Contraseña actual incorrecta']);
        exit;
    }
    
    // Hashear nueva contraseña
    $new_password_hash = password_hash($new_password, PASSWORD_BCRYPT);
    
    // Actualizar contraseña
    $stmt = $pdo->prepare("
        UPDATE usuarios_plaza 
        SET password_hash = ?, updated_at = NOW() 
        WHERE id = ?
    ");
    $stmt->execute([$new_password_hash, $usuario['id']]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Contraseña actualizada exitosamente'
    ]);
    
} catch (PDOException $e) {
    error_log("Error cambiando contraseña: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}

