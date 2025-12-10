<?php
/**
 * API de autenticación - Login de usuarios
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

// Obtener datos del POST
$input = json_decode(file_get_contents('php://input'), true);
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email y contraseña son requeridos']);
    exit;
}

try {
    // Buscar usuario (primero sin restricción de activo para diagnóstico)
    $stmt = $pdo->prepare("
        SELECT u.*, t.id as tienda_id, t.nombre as tienda_nombre, t.url as tienda_url, t.app_password_encrypted, t.activa as tienda_activa
        FROM usuarios_plaza u
        LEFT JOIN tiendas t ON u.tienda_id = t.id
        WHERE (u.email = ? OR u.username = ?)
    ");
    $stmt->execute([$email, $email]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$usuario) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Credenciales inválidas',
            'debug' => 'Usuario no encontrado con email/username: ' . htmlspecialchars($email)
        ]);
        exit;
    }
    
    // Verificar si el usuario está activo
    if (!$usuario['activa']) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Credenciales inválidas',
            'debug' => 'Usuario inactivo'
        ]);
        exit;
    }
    
    // Verificar si tiene tienda asignada
    if (!$usuario['tienda_id']) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Credenciales inválidas',
            'debug' => 'Usuario sin tienda asignada'
        ]);
        exit;
    }
    
    // Verificar si la tienda está activa
    if (!$usuario['tienda_activa']) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Credenciales inválidas',
            'debug' => 'Tienda inactiva'
        ]);
        exit;
    }
    
    // Verificar si tiene password_hash
    if (empty($usuario['password_hash'])) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Credenciales inválidas',
            'debug' => 'Usuario sin contraseña configurada'
        ]);
        exit;
    }
    
    // Verificar contraseña
    $password_valid = password_verify($password, $usuario['password_hash']);
    
    if (!$password_valid) {
        // Log para diagnóstico (solo en desarrollo)
        error_log("Login fallido - Usuario ID: {$usuario['id']}, Email: {$email}, Hash length: " . strlen($usuario['password_hash']));
        
        http_response_code(401);
        echo json_encode([
            'error' => 'Credenciales inválidas',
            'debug' => 'Contraseña incorrecta'
        ]);
        exit;
    }
    
    // Generar token de sesión
    $token = bin2hex(random_bytes(32));
    $expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));
    
    // Guardar sesión
    $stmt = $pdo->prepare("
        INSERT INTO sesiones (usuario_id, token, expires_at) 
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$usuario['id'], $token, $expires_at]);
    
    // Preparar respuesta
    $response = [
        'success' => true,
        'token' => $token,
        'usuario' => [
            'id' => $usuario['id'],
            'email' => $usuario['email'],
            'username' => $usuario['username'],
            'nombre' => $usuario['nombre']
        ],
        'tienda' => [
            'id' => $usuario['tienda_id'],
            'nombre' => $usuario['tienda_nombre'],
            'url' => $usuario['tienda_url']
        ]
    ];
    
    echo json_encode($response);
    
} catch (PDOException $e) {
    error_log("Error en login: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}

