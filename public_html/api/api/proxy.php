<?php
/**
 * Proxy a WooCommerce REST API
 * Actúa como intermediario entre el frontend y WooCommerce
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth-check.php';
require_once __DIR__ . '/../includes/encryption.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Obtener token de sesión
$token = $_GET['token'] ?? $_POST['token'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);
if (isset($input['token'])) {
    $token = $input['token'];
}

// Verificar sesión
$usuario = verify_session($token);

if (!$usuario) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado. Token inválido o expirado.']);
    exit;
}

// Obtener tienda del usuario
try {
    $stmt = $pdo->prepare("
        SELECT * FROM tiendas 
        WHERE id = ? AND activa = 1
    ");
    $stmt->execute([$usuario['tienda_id']]);
    $tienda = $stmt->fetch();
    
    if (!$tienda) {
        http_response_code(404);
        echo json_encode(['error' => 'Tienda no encontrada', 'debug' => 'Tienda ID: ' . $usuario['tienda_id']]);
        exit;
    }
    
    // Verificar que tenga Application Password
    if (empty($tienda['app_password_encrypted'])) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Error al obtener credenciales de la tienda',
            'debug' => 'La tienda no tiene Application Password configurado'
        ]);
        exit;
    }
    
    // Desencriptar Application Password
    $app_password = decrypt_credential($tienda['app_password_encrypted']);
    
    if ($app_password === false || empty($app_password)) {
        error_log("Error desencriptando Application Password - Tienda ID: {$tienda['id']}, Hash length: " . strlen($tienda['app_password_encrypted']));
        http_response_code(500);
        echo json_encode([
            'error' => 'Error al obtener credenciales de la tienda',
            'debug' => 'No se pudo desencriptar el Application Password. Verifica que la tienda tenga un Application Password válido guardado.'
        ]);
        exit;
    }
    
    // Verificar que tenga wp_user
    if (empty($tienda['wp_user'])) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Error al obtener credenciales de la tienda',
            'debug' => 'La tienda no tiene usuario de WordPress configurado'
        ]);
        exit;
    }
    
    // Obtener endpoint y método
    $endpoint = $_GET['endpoint'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];
    
    if (empty($endpoint)) {
        http_response_code(400);
        echo json_encode(['error' => 'Endpoint requerido']);
        exit;
    }
    
    // Construir URL de WooCommerce
    $base_url = rtrim($tienda['url'], '/');
    $wc_url = $base_url . '/wp-json/wc/v3' . $endpoint;
    
    // Agregar query parameters si existen
    $query_params = $_GET;
    unset($query_params['token'], $query_params['endpoint']);
    if (!empty($query_params)) {
        $wc_url .= '?' . http_build_query($query_params);
    }
    
    // Preparar headers
    $credentials = base64_encode($tienda['wp_user'] . ':' . $app_password);
    $headers = [
        'Authorization: Basic ' . $credentials,
        'Content-Type: application/json'
    ];
    
    // Obtener body si existe
    $body = null;
    if ($method === 'POST' || $method === 'PUT') {
        $body_data = file_get_contents('php://input');
        $input_data = json_decode($body_data, true);
        if (isset($input_data['token'])) {
            unset($input_data['token']);
        }
        $body = json_encode($input_data);
    }
    
    // Hacer petición a WooCommerce usando cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $wc_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($curl_error) {
        http_response_code(500);
        echo json_encode(['error' => 'Error de conexión: ' . $curl_error]);
        exit;
    }
    
    // Devolver respuesta
    http_response_code($http_code);
    echo $response;
    
} catch (PDOException $e) {
    error_log("Error en proxy: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}

