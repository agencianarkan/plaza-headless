<?php
/**
 * Plugin Name: Plaza Upload Endpoint
 * Description: Endpoint personalizado para subir imágenes desde Plaza y autenticación con Google OAuth
 * Version: 2.0
 * Author: Plaza
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Obtener headers HTTP (compatible con todos los servidores)
 * Definir primero para que esté disponible en todos los hooks
 */
function plaza_get_all_headers() {
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if ($headers) {
            return $headers;
        }
    }
    
    // Fallback para servidores que no tienen getallheaders()
    $headers = array();
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) == 'HTTP_') {
            $header_name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            $headers[$header_name] = $value;
        }
    }
    
    // También verificar Authorization directamente
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers['Authorization'] = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers['Authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    
    return $headers;
}

/**
 * Agregar headers CORS antes de servir respuesta REST
 */
add_filter('rest_pre_serve_request', 'plaza_add_cors_headers', 10, 4);

function plaza_add_cors_headers($served, $result, $request, $server) {
    // Solo agregar headers para endpoints de Plaza
    if (!is_object($request) || !method_exists($request, 'get_route')) {
        return $served;
    }
    
    $route = $request->get_route();
    if (empty($route) || strpos($route, '/plaza/v1/') === false) {
        return $served;
    }
    
    $allowed_origins = array(
        'https://agencianarkan.github.io',
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:8000'
    );
    
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    
    if (in_array($origin, $allowed_origins)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
    }
    
    return $served;
}

/**
 * Registrar endpoint personalizado para subir imágenes
 */
add_action('rest_api_init', function() {
    // Endpoint para subir imágenes
    register_rest_route('plaza/v1', '/upload-image', array(
        'methods' => 'POST',
        'callback' => 'plaza_upload_image',
        'permission_callback' => 'plaza_check_permissions',
        'args' => array(
            'file' => array(
                'required' => true,
                'type' => 'string',
                'description' => 'Base64 encoded image file',
            ),
            'filename' => array(
                'required' => false,
                'type' => 'string',
                'default' => 'image.jpg',
            ),
        ),
    ));
    
    // Endpoint para obtener Client ID de Google (público)
    register_rest_route('plaza/v1', '/google-client-id', array(
        'methods' => 'GET',
        'callback' => 'plaza_get_google_client_id',
        'permission_callback' => '__return_true', // Público
    ));
    
    // Endpoint para autenticación con Google OAuth
    register_rest_route('plaza/v1', '/google-auth', array(
        'methods' => 'POST',
        'callback' => 'plaza_google_auth',
        'permission_callback' => '__return_true', // Público, validamos después
        'args' => array(
            'code' => array(
                'required' => true,
                'type' => 'string',
                'description' => 'Authorization code from Google',
            ),
            'redirect_uri' => array(
                'required' => true,
                'type' => 'string',
                'description' => 'Redirect URI used in OAuth flow',
            ),
        ),
    ));
});

// Las funciones se definen después, pero los hooks se registran aquí
// Middleware: Interceptar peticiones REST para validar tokens JWT
add_filter('rest_authentication_errors', 'plaza_rest_authentication', 10, 2);

// Agregar menú de configuración en WordPress Admin
add_action('admin_menu', 'plaza_add_admin_menu');
add_action('admin_init', 'plaza_settings_init');

function plaza_add_admin_menu() {
    add_options_page(
        'Plaza Settings',
        'Plaza',
        'manage_options',
        'plaza-settings',
        'plaza_options_page'
    );
}

function plaza_settings_init() {
    register_setting('plaza_settings', 'plaza_google_client_id');
    register_setting('plaza_settings', 'plaza_google_client_secret');
    
    add_settings_section(
        'plaza_google_section',
        'Configuración de Google OAuth',
        'plaza_google_section_callback',
        'plaza-settings'
    );
    
    add_settings_field(
        'plaza_google_client_id',
        'Google Client ID',
        'plaza_google_client_id_render',
        'plaza-settings',
        'plaza_google_section'
    );
    
    add_settings_field(
        'plaza_google_client_secret',
        'Google Client Secret',
        'plaza_google_client_secret_render',
        'plaza-settings',
        'plaza_google_section'
    );
}

function plaza_google_section_callback() {
    echo '<p>Configura las credenciales de Google OAuth para permitir inicio de sesión con Google en Plaza.</p>';
    echo '<p><strong>Instrucciones:</strong></p>';
    echo '<ol>';
    echo '<li>Ve a <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>';
    echo '<li>Crea un proyecto o selecciona uno existente</li>';
    echo '<li>Habilita "Google+ API" o "Google Identity API"</li>';
    echo '<li>Crea credenciales OAuth 2.0 (tipo: Aplicación web)</li>';
    echo '<li>Copia el Client ID y Client Secret aquí</li>';
    echo '<li>Configura la URL de redirección: <code>https://agencianarkan.github.io/plaza-headless/</code></li>';
    echo '</ol>';
}

function plaza_google_client_id_render() {
    $value = get_option('plaza_google_client_id', '');
    echo '<input type="text" name="plaza_google_client_id" value="' . esc_attr($value) . '" class="regular-text">';
}

function plaza_google_client_secret_render() {
    $value = get_option('plaza_google_client_secret', '');
    echo '<input type="password" name="plaza_google_client_secret" value="' . esc_attr($value) . '" class="regular-text">';
}

function plaza_options_page() {
    ?>
    <div class="wrap">
        <h1>Configuración de Plaza</h1>
        <form action="options.php" method="post">
            <?php
            settings_fields('plaza_settings');
            do_settings_sections('plaza-settings');
            submit_button();
            ?>
        </form>
    </div>
    <?php
}


/**
 * Middleware: Validar tokens JWT en peticiones REST
 */
function plaza_rest_authentication($result, $server) {
    // Si ya hay un resultado (autenticación exitosa o error específico), no interferir
    if (!empty($result)) {
        return $result;
    }
    
    // Solo procesar peticiones a la API de WooCommerce
    $request_uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
    if (strpos($request_uri, '/wp-json/wc/v3/') === false) {
        return $result; // No es una petición a WooCommerce, dejar pasar
    }
    
    // Verificar que las funciones necesarias existan
    if (!function_exists('plaza_get_all_headers') || !function_exists('plaza_validate_token')) {
        return $result; // Si no existen las funciones, no interferir
    }
    
    // Obtener token del header Authorization
    $headers = plaza_get_all_headers();
    $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (empty($auth_header)) {
        return new WP_Error(
            'plaza_unauthorized',
            'Token de autorización requerido. Por favor, inicia sesión con Google.',
            array('status' => 401)
        );
    }
    
    // Extraer token Bearer
    if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        $token = $matches[1];
    } else {
        return new WP_Error(
            'plaza_invalid_token',
            'Formato de token inválido. Use: Authorization: Bearer <token>',
            array('status' => 401)
        );
    }
    
    // Validar token
    $user_id = plaza_validate_token($token);
    
    if (!$user_id) {
        return new WP_Error(
            'plaza_invalid_token',
            'Token inválido o expirado. Por favor, inicia sesión nuevamente.',
            array('status' => 401)
        );
    }
    
    // Establecer usuario actual para WordPress
    wp_set_current_user($user_id);
    
    // Verificar que tenga permisos adecuados
    $user = get_userdata($user_id);
    if (!$user || (!user_can($user_id, 'manage_woocommerce') && !user_can($user_id, 'administrator'))) {
        return new WP_Error(
            'plaza_insufficient_permissions',
            'No tienes permisos suficientes. Se requiere rol de Administrator o Shop Manager.',
            array('status' => 403)
        );
    }
    
    // Token válido, permitir acceso
    return true;
}

/**
 * Verificar permisos del usuario usando token JWT (para endpoints personalizados)
 */
function plaza_check_permissions() {
    // Obtener token del header Authorization
    $headers = plaza_get_all_headers();
    $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (empty($auth_header)) {
        return new WP_Error('unauthorized', 'Token de autorización requerido', array('status' => 401));
    }
    
    // Extraer token Bearer
    if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        $token = $matches[1];
    } else {
        return new WP_Error('unauthorized', 'Formato de token inválido', array('status' => 401));
    }
    
    // Validar token
    $user_id = plaza_validate_token($token);
    
    if (!$user_id) {
        return new WP_Error('unauthorized', 'Token inválido o expirado', array('status' => 401));
    }
    
    // Establecer usuario actual para WordPress
    wp_set_current_user($user_id);
    
    // Verificar que tenga permisos de subir archivos
    if (!current_user_can('upload_files')) {
        return new WP_Error('forbidden', 'No tienes permisos para subir archivos', array('status' => 403));
    }
    
    return true;
}

/**
 * Subir imagen desde base64
 */
function plaza_upload_image($request) {
    $file_data = $request->get_param('file');
    $filename = $request->get_param('filename') ?: 'image.jpg';
    
    // Validar que sea base64
    if (!preg_match('/^data:image\/(\w+);base64,/', $file_data, $matches)) {
        return new WP_Error('invalid_format', 'Formato de imagen inválido. Debe ser base64.', array('status' => 400));
    }
    
    $image_type = $matches[1]; // jpeg, png, gif, etc.
    $file_data = preg_replace('/^data:image\/\w+;base64,/', '', $file_data);
    $file_data = base64_decode($file_data);
    
    if ($file_data === false) {
        return new WP_Error('decode_error', 'Error al decodificar la imagen', array('status' => 400));
    }
    
    // Validar tipo de imagen
    $allowed_types = array('jpg', 'jpeg', 'png', 'gif', 'webp');
    if (!in_array(strtolower($image_type), $allowed_types)) {
        return new WP_Error('invalid_type', 'Tipo de imagen no permitido. Use: jpg, png, gif o webp', array('status' => 400));
    }
    
    // Generar nombre único para el archivo
    $upload_dir = wp_upload_dir();
    $unique_filename = wp_unique_filename($upload_dir['path'], $filename);
    $file_path = $upload_dir['path'] . '/' . $unique_filename;
    
    // Guardar archivo
    file_put_contents($file_path, $file_data);
    
    // Validar que sea una imagen válida
    $image_info = @getimagesize($file_path);
    if ($image_info === false) {
        @unlink($file_path);
        return new WP_Error('invalid_image', 'El archivo no es una imagen válida', array('status' => 400));
    }
    
    // Crear attachment en WordPress
    $attachment = array(
        'post_mime_type' => 'image/' . $image_type,
        'post_title' => sanitize_file_name(pathinfo($unique_filename, PATHINFO_FILENAME)),
        'post_content' => '',
        'post_status' => 'inherit'
    );
    
    $attach_id = wp_insert_attachment($attachment, $file_path);
    
    if (is_wp_error($attach_id)) {
        @unlink($file_path);
        return new WP_Error('upload_failed', 'Error al crear el attachment', array('status' => 500));
    }
    
    // Generar metadatos de la imagen
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    $attach_data = wp_generate_attachment_metadata($attach_id, $file_path);
    wp_update_attachment_metadata($attach_id, $attach_data);
    
    // Obtener URL de la imagen
    $image_url = wp_get_attachment_url($attach_id);
    
    return array(
        'success' => true,
        'url' => $image_url,
        'id' => $attach_id,
        'message' => 'Imagen subida exitosamente'
    );
}

/**
 * Obtener Client ID de Google (público)
 */
function plaza_get_google_client_id($request) {
    $client_id = get_option('plaza_google_client_id', '');
    
    if (empty($client_id)) {
        return new WP_Error(
            'not_configured', 
            'Google OAuth no está configurado. Ve a Configuración > Plaza para configurarlo.', 
            array('status' => 404)
        );
    }
    
    return array(
        'client_id' => $client_id,
        'configured' => true
    );
}

/**
 * Autenticación con Google OAuth
 */
function plaza_google_auth($request) {
    $code = $request->get_param('code');
    $redirect_uri = $request->get_param('redirect_uri');
    
    if (empty($code) || empty($redirect_uri)) {
        return new WP_Error('missing_params', 'Código y redirect_uri son requeridos', array('status' => 400));
    }
    
    // Obtener credenciales de Google
    $client_id = get_option('plaza_google_client_id', '');
    $client_secret = get_option('plaza_google_client_secret', '');
    
    if (empty($client_id) || empty($client_secret)) {
        return new WP_Error('not_configured', 'Google OAuth no está configurado. Contacta al administrador.', array('status' => 500));
    }
    
    // Paso 1: Intercambiar código por token
    $token_data = plaza_exchange_code_for_token($code, $client_id, $client_secret, $redirect_uri);
    
    if (is_wp_error($token_data)) {
        return $token_data;
    }
    
    $access_token = $token_data['access_token'];
    
    // Paso 2: Obtener información del usuario desde Google
    $user_info = plaza_get_google_user_info($access_token);
    
    if (is_wp_error($user_info)) {
        return $user_info;
    }
    
    $email = $user_info['email'];
    
    // Paso 3: Buscar usuario en WordPress por email
    $user = get_user_by('email', $email);
    
    if (!$user) {
        return new WP_Error('user_not_found', 'Este email no está registrado en WordPress. Contacta al administrador.', array('status' => 404));
    }
    
    // Paso 4: Generar Token JWT
    $token = plaza_generate_jwt_token($user->ID);
    
    if (is_wp_error($token)) {
        return $token;
    }
    
    // Paso 5: Obtener URL base del sitio
    $base_url = home_url();
    
    // Devolver credenciales con token JWT
    return array(
        'success' => true,
        'token' => $token,
        'baseUrl' => $base_url,
        'email' => $email,
        'userId' => $user->ID,
        'username' => $user->user_login,
        'message' => 'Autenticación exitosa'
    );
}

/**
 * Intercambiar código de autorización por access token
 */
function plaza_exchange_code_for_token($code, $client_id, $client_secret, $redirect_uri) {
    $token_url = 'https://oauth2.googleapis.com/token';
    
    $body = array(
        'code' => $code,
        'client_id' => $client_id,
        'client_secret' => $client_secret,
        'redirect_uri' => $redirect_uri,
        'grant_type' => 'authorization_code'
    );
    
    $response = wp_remote_post($token_url, array(
        'body' => $body,
        'timeout' => 30
    ));
    
    if (is_wp_error($response)) {
        return new WP_Error('token_exchange_failed', 'Error al intercambiar código por token: ' . $response->get_error_message(), array('status' => 500));
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);
    
    if ($response_code !== 200) {
        $error_message = isset($data['error_description']) ? $data['error_description'] : 'Error desconocido';
        return new WP_Error('token_exchange_failed', 'Error de Google: ' . $error_message, array('status' => $response_code));
    }
    
    if (!isset($data['access_token'])) {
        return new WP_Error('token_exchange_failed', 'No se recibió access_token de Google', array('status' => 500));
    }
    
    return $data;
}

/**
 * Obtener información del usuario desde Google
 */
function plaza_get_google_user_info($access_token) {
    $user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo';
    
    $response = wp_remote_get($user_info_url, array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $access_token
        ),
        'timeout' => 30
    ));
    
    if (is_wp_error($response)) {
        return new WP_Error('user_info_failed', 'Error al obtener información del usuario: ' . $response->get_error_message(), array('status' => 500));
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);
    
    if ($response_code !== 200) {
        $error_message = isset($data['error']['message']) ? $data['error']['message'] : 'Error desconocido';
        return new WP_Error('user_info_failed', 'Error de Google: ' . $error_message, array('status' => $response_code));
    }
    
    if (!isset($data['email'])) {
        return new WP_Error('user_info_failed', 'No se pudo obtener el email del usuario', array('status' => 500));
    }
    
    return $data;
}

/**
 * Generar Token JWT para un usuario
 */
function plaza_generate_jwt_token($user_id) {
    $user = get_user_by('ID', $user_id);
    
    if (!$user) {
        return new WP_Error('user_not_found', 'Usuario no encontrado', array('status' => 404));
    }
    
    // Generar token único y seguro
    $token_data = array(
        'user_id' => $user_id,
        'email' => $user->user_email,
        'login' => $user->user_login,
        'created_at' => time(),
        'expires_at' => time() + (30 * 24 * 60 * 60) // 30 días
    );
    
    // Obtener o generar clave secreta para firmar tokens
    $secret_key = get_option('plaza_jwt_secret', '');
    if (empty($secret_key)) {
        $secret_key = wp_generate_password(64, true, true);
        update_option('plaza_jwt_secret', $secret_key);
    }
    
    // Crear payload codificado
    $payload = base64_encode(json_encode($token_data));
    
    // Crear firma HMAC
    $signature = hash_hmac('sha256', $payload, $secret_key);
    
    // Crear token JWT (payload.signature)
    $token = $payload . '.' . $signature;
    
    // Guardar token en user meta para validación rápida
    update_user_meta($user_id, 'plaza_jwt_token', $token);
    update_user_meta($user_id, 'plaza_jwt_expires', $token_data['expires_at']);
    
    return $token;
}

/**
 * Validar Token JWT
 */
function plaza_validate_token($token) {
    if (empty($token)) {
        return false;
    }
    
    // Separar payload y firma
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return false;
    }
    
    $payload = $parts[0];
    $signature = $parts[1];
    
    // Obtener clave secreta
    $secret_key = get_option('plaza_jwt_secret', '');
    if (empty($secret_key)) {
        return false;
    }
    
    // Verificar firma
    $expected_signature = hash_hmac('sha256', $payload, $secret_key);
    if (!hash_equals($expected_signature, $signature)) {
        return false;
    }
    
    // Decodificar payload
    $token_data = json_decode(base64_decode($payload), true);
    if (!$token_data || !isset($token_data['user_id'])) {
        return false;
    }
    
    // Verificar expiración
    if (isset($token_data['expires_at']) && time() > $token_data['expires_at']) {
        return false;
    }
    
    // Verificar que el usuario existe
    $user = get_user_by('ID', $token_data['user_id']);
    if (!$user) {
        return false;
    }
    
    return $token_data['user_id'];
}

