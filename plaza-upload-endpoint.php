<?php
/**
 * Plugin Name: Plaza Upload Endpoint
 * Description: Endpoint personalizado para subir imágenes desde Plaza y autenticación con Google OAuth
 * Version: 2.1
 * Author: Plaza
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Agregar headers CORS de forma simple
 */
function plaza_add_cors_headers() {
    $allowed_origins = array(
        'https://agencianarkan.github.io',
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:8000'
    );
    
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    
    // Si no hay origin en el header, intentar obtenerlo de Referer
    if (empty($origin) && isset($_SERVER['HTTP_REFERER'])) {
        $referer = parse_url($_SERVER['HTTP_REFERER'], PHP_URL_ORIGIN);
        if ($referer) {
            $origin = $referer;
        }
    }
    
    // Si el origin está en la lista permitida, agregarlo
    if (in_array($origin, $allowed_origins)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
    } else if (!empty($origin)) {
        // Si hay origin pero no está en la lista, aún así permitirlo para debugging
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
    }
}

/**
 * Manejar OPTIONS requests para CORS (muy temprano, antes de que WordPress procese)
 */
add_action('plugins_loaded', function() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS' && 
        isset($_SERVER['REQUEST_URI']) && 
        strpos($_SERVER['REQUEST_URI'], '/wp-json/') !== false) {
        plaza_add_cors_headers();
        http_response_code(200);
        exit();
    }
}, 1);

/**
 * También manejar OPTIONS en init para casos especiales
 */
add_action('init', function() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS' && 
        isset($_SERVER['REQUEST_URI']) && 
        strpos($_SERVER['REQUEST_URI'], '/wp-json/') !== false) {
        plaza_add_cors_headers();
        http_response_code(200);
        exit();
    }
}, 1);

/**
 * Registrar endpoints REST
 */
add_action('rest_api_init', function() {
    // Agregar CORS a todas las respuestas REST de Plaza
    add_filter('rest_pre_serve_request', function($served, $result, $request) {
        if (is_object($request) && method_exists($request, 'get_route')) {
            $route = $request->get_route();
            if (!empty($route) && strpos($route, '/plaza/v1/') !== false) {
                plaza_add_cors_headers();
            }
        }
        return $served;
    }, 10, 3);
    
    // También agregar CORS headers antes de enviar la respuesta
    add_filter('rest_post_dispatch', function($result, $server, $request) {
        if (is_object($request) && method_exists($request, 'get_route')) {
            $route = $request->get_route();
            if (!empty($route) && strpos($route, '/plaza/v1/') !== false) {
                plaza_add_cors_headers();
            }
        }
        return $result;
    }, 10, 3);
    
    // Endpoint para obtener Client ID de Google
    register_rest_route('plaza/v1', '/google-client-id', array(
        'methods' => 'GET',
        'callback' => function() {
            $client_id = get_option('plaza_google_client_id', '');
            if (empty($client_id)) {
                return new WP_Error('not_configured', 'Google OAuth no está configurado', array('status' => 404));
            }
            return array(
                'client_id' => $client_id,
                'configured' => true
            );
        },
        'permission_callback' => '__return_true',
    ));
    
    // Endpoint para autenticación con Google OAuth (código personalizado)
    register_rest_route('plaza/v1', '/google-auth', array(
        'methods' => 'POST',
        'callback' => 'plaza_google_auth',
        'permission_callback' => '__return_true',
    ));
    
    // Endpoint para obtener token después de login con Nextend Social Login
    register_rest_route('plaza/v1', '/get-token', array(
        'methods' => 'GET',
        'callback' => 'plaza_get_token_from_session',
        'permission_callback' => '__return_true',
    ));
    
    // Endpoint para login directo con usuario/contraseña
    register_rest_route('plaza/v1', '/login', array(
        'methods' => 'POST',
        'callback' => 'plaza_direct_login',
        'permission_callback' => '__return_true',
    ));
    
    // Endpoint para login con token (MÁS SIMPLE - sin contraseña)
    register_rest_route('plaza/v1', '/login-token', array(
        'methods' => 'POST',
        'callback' => 'plaza_login_with_token',
        'permission_callback' => '__return_true',
    ));
    
    // Endpoint para subir imágenes
    register_rest_route('plaza/v1', '/upload-image', array(
        'methods' => 'POST',
        'callback' => 'plaza_upload_image',
        'permission_callback' => 'plaza_check_permissions',
    ));
});

/**
 * Middleware: Validar tokens personalizados en peticiones a WooCommerce
 */
add_filter('rest_authentication_errors', 'plaza_rest_authentication', 10, 2);

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
    
    // Obtener token del header Authorization
    $headers = array();
    foreach ($_SERVER as $key => $value) {
        if (substr($key, 0, 5) === 'HTTP_') {
            $header = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
            $headers[$header] = $value;
        }
    }
    
    $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : 
                   (isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '');
    
    if (empty($auth_header) || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        return new WP_Error(
            'plaza_unauthorized',
            'Token de autorización requerido. Por favor, inicia sesión con tu token personalizado.',
            array('status' => 401)
        );
    }
    
    $token = $matches[1];
    
    // Buscar token en tokens personalizados
    $users = get_users(array(
        'meta_key' => 'plaza_tokens',
        'number' => -1
    ));
    
    $found_user = null;
    
    foreach ($users as $user) {
        $tokens = get_user_meta($user->ID, 'plaza_tokens', true);
        if (!is_array($tokens)) {
            continue;
        }
        
        foreach ($tokens as $token_data) {
            if (isset($token_data['token']) && $token_data['token'] === $token) {
                $found_user = $user;
                break 2;
            }
        }
    }
    
    if (!$found_user) {
        return new WP_Error(
            'plaza_invalid_token',
            'Token inválido. Verifica tu token o genera uno nuevo desde tu perfil de WordPress.',
            array('status' => 401)
        );
    }
    
    $user_id = $found_user->ID;
    
    // Verificar permisos
    $is_admin = user_can($user_id, 'administrator');
    $is_shop_manager = user_can($user_id, 'manage_woocommerce');
    
    if (!$is_admin && !$is_shop_manager) {
        return new WP_Error(
            'plaza_insufficient_permissions',
            'Se requiere rol de Administrator o Shop Manager',
            array('status' => 403)
        );
    }
    
    // Establecer usuario actual para WordPress
    wp_set_current_user($user_id);
    
    // Token válido, permitir acceso
    return true;
}

/**
 * Menú de configuración
 */
add_action('admin_menu', function() {
    add_options_page('Plaza Settings', 'Plaza', 'manage_options', 'plaza-settings', 'plaza_options_page');
});

/**
 * Agregar sección de Plaza en perfil de usuario (Tokens Personalizables)
 */
add_action('show_user_profile', 'plaza_user_profile_fields');
add_action('edit_user_profile', 'plaza_user_profile_fields');
add_action('personal_options_update', 'plaza_save_user_profile_fields');
add_action('edit_user_profile_update', 'plaza_save_user_profile_fields');

function plaza_user_profile_fields($user) {
    // Solo mostrar para usuarios con permisos
    if (!user_can($user->ID, 'manage_woocommerce') && !user_can($user->ID, 'administrator')) {
        return;
    }
    
    // Obtener todos los tokens del usuario
    $tokens = get_user_meta($user->ID, 'plaza_tokens', true);
    if (!is_array($tokens)) {
        $tokens = array();
    }
    
    ?>
    <h3>Plaza - Tokens de Acceso Personalizables</h3>
    <table class="form-table">
        <tr>
            <th><label>Gestionar Tokens</label></th>
            <td>
                <div id="plaza-tokens-list">
                    <?php if (!empty($tokens)): ?>
                        <table class="widefat" style="margin-bottom: 15px;">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Token</th>
                                    <th>Creado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($tokens as $token_id => $token_data): ?>
                                    <tr>
                                        <td><strong><?php echo esc_html($token_data['name']); ?></strong></td>
                                        <td>
                                            <code style="font-size: 11px;"><?php echo esc_html($token_data['token']); ?></code>
                                            <button type="button" class="button button-small" onclick="copyToken('<?php echo esc_js($token_data['token']); ?>')">Copiar</button>
                                        </td>
                                        <td><?php echo date('d/m/Y H:i', $token_data['created']); ?></td>
                                        <td>
                                            <a href="?plaza_delete_token=<?php echo esc_attr($token_id); ?>&user_id=<?php echo $user->ID; ?>" 
                                               class="button button-small" 
                                               onclick="return confirm('¿Eliminar este token?')">Eliminar</a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php else: ?>
                        <p>No hay tokens creados. Crea uno nuevo abajo.</p>
                    <?php endif; ?>
                </div>
                
                <hr style="margin: 20px 0;">
                
                <h4>Crear Nuevo Token</h4>
                <form method="post" action="">
                    <?php wp_nonce_field('plaza_create_token', 'plaza_token_nonce'); ?>
                    <input type="hidden" name="plaza_action" value="create_token">
                    <input type="hidden" name="user_id" value="<?php echo $user->ID; ?>">
                    
                    <p>
                        <label for="plaza_token_name"><strong>Nombre del Token:</strong></label><br>
                        <input type="text" name="plaza_token_name" id="plaza_token_name" class="regular-text" 
                               placeholder="Ej: Plaza Desktop, Plaza Móvil, etc." required>
                        <span class="description">Elige un nombre descriptivo para identificar este token.</span>
                    </p>
                    
                    <p>
                        <label for="plaza_token_value"><strong>Valor del Token (Personalizable):</strong></label><br>
                        <input type="text" name="plaza_token_value" id="plaza_token_value" class="regular-text" 
                               placeholder="Deja vacío para generar automáticamente" 
                               pattern="[A-Za-z0-9_-]{8,}" 
                               title="Mínimo 8 caracteres. Solo letras, números, guiones y guiones bajos.">
                        <span class="description">
                            Personaliza tu token o déjalo vacío para generar uno automático. 
                            Mínimo 8 caracteres. Solo letras, números, guiones (-) y guiones bajos (_).
                        </span>
                    </p>
                    
                    <p>
                        <button type="submit" class="button button-primary">Crear Token</button>
                    </p>
                </form>
                
                <script>
                function copyToken(token) {
                    navigator.clipboard.writeText(token).then(function() {
                        alert('Token copiado al portapapeles');
                    });
                }
                </script>
            </td>
        </tr>
    </table>
    <?php
}

function plaza_save_user_profile_fields($user_id) {
    if (!current_user_can('edit_user', $user_id)) {
        return;
    }
    
    if (!isset($_POST['plaza_action']) || $_POST['plaza_action'] !== 'create_token') {
        return;
    }
    
    if (!isset($_POST['plaza_token_nonce']) || !wp_verify_nonce($_POST['plaza_token_nonce'], 'plaza_create_token')) {
        return;
    }
    
    $token_name = sanitize_text_field($_POST['plaza_token_name']);
    $token_value = isset($_POST['plaza_token_value']) ? trim($_POST['plaza_token_value']) : '';
    
    if (empty($token_name)) {
        return;
    }
    
    // Si no se proporciona valor, generar uno automático
    if (empty($token_value)) {
        $token_value = wp_generate_password(16, false, false);
    } else {
        // Validar formato personalizado
        if (!preg_match('/^[A-Za-z0-9_-]{8,}$/', $token_value)) {
            add_action('admin_notices', function() {
                echo '<div class="error"><p>El token debe tener mínimo 8 caracteres y solo puede contener letras, números, guiones y guiones bajos.</p></div>';
            });
            return;
        }
    }
    
    // Verificar que el token no esté duplicado
    $tokens = get_user_meta($user_id, 'plaza_tokens', true);
    if (!is_array($tokens)) {
        $tokens = array();
    }
    
    foreach ($tokens as $existing_token) {
        if ($existing_token['token'] === $token_value) {
            add_action('admin_notices', function() {
                echo '<div class="error"><p>Este token ya existe. Elige otro valor.</p></div>';
            });
            return;
        }
    }
    
    // Crear nuevo token
    $token_id = uniqid('plaza_', true);
    $tokens[$token_id] = array(
        'name' => $token_name,
        'token' => $token_value,
        'created' => time()
    );
    
    update_user_meta($user_id, 'plaza_tokens', $tokens);
    
    add_action('admin_notices', function() {
        echo '<div class="notice notice-success"><p>Token creado exitosamente.</p></div>';
    });
}

/**
 * Manejar eliminación de token desde perfil
 */
add_action('admin_init', function() {
    if (isset($_GET['plaza_delete_token']) && isset($_GET['user_id']) && current_user_can('edit_user', $_GET['user_id'])) {
        $token_id = sanitize_text_field($_GET['plaza_delete_token']);
        $user_id = intval($_GET['user_id']);
        
        $tokens = get_user_meta($user_id, 'plaza_tokens', true);
        if (is_array($tokens) && isset($tokens[$token_id])) {
            unset($tokens[$token_id]);
            update_user_meta($user_id, 'plaza_tokens', $tokens);
        }
        
        wp_redirect(admin_url('user-edit.php?user_id=' . $user_id . '&plaza_token_deleted=1'));
        exit;
    }
});

add_action('admin_init', function() {
    register_setting('plaza_settings', 'plaza_google_client_id');
    register_setting('plaza_settings', 'plaza_google_client_secret');
    
    add_settings_section('plaza_google_section', 'Configuración de Google OAuth', function() {
        echo '<p>Configura las credenciales de Google OAuth.</p>';
        echo '<ol>';
        echo '<li>Ve a <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>';
        echo '<li>Crea un proyecto y habilita "Google Identity API"</li>';
        echo '<li>Crea credenciales OAuth 2.0 (Aplicación web)</li>';
        echo '<li>Configura la URL de redirección: <code>https://agencianarkan.github.io/plaza-headless/</code></li>';
        echo '</ol>';
    }, 'plaza-settings');
    
    add_settings_field('plaza_google_client_id', 'Google Client ID', function() {
        $value = get_option('plaza_google_client_id', '');
        echo '<input type="text" name="plaza_google_client_id" value="' . esc_attr($value) . '" class="regular-text">';
    }, 'plaza-settings', 'plaza_google_section');
    
    add_settings_field('plaza_google_client_secret', 'Google Client Secret', function() {
        $value = get_option('plaza_google_client_secret', '');
        echo '<input type="password" name="plaza_google_client_secret" value="' . esc_attr($value) . '" class="regular-text">';
    }, 'plaza-settings', 'plaza_google_section');
});

function plaza_options_page() {
    ?>
    <div class="wrap">
        <h1>Configuración de Plaza</h1>
        <form action="options.php" method="post">
            <?php settings_fields('plaza_settings'); ?>
            <?php do_settings_sections('plaza-settings'); ?>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

/**
 * Login con token personalizable (PERMANENTE - sin expiración)
 * El usuario genera tokens personalizados desde su perfil de WordPress
 */
function plaza_login_with_token($request) {
    // Agregar headers CORS primero
    plaza_add_cors_headers();
    
    $token = $request->get_param('token');
    
    if (empty($token)) {
        return new WP_REST_Response(
            array('success' => false, 'message' => 'Token requerido'),
            400
        );
    }
    
    // Buscar usuario que tenga este token en sus tokens personalizados
    $users = get_users(array(
        'meta_key' => 'plaza_tokens',
        'number' => -1
    ));
    
    $found_user = null;
    $found_token_data = null;
    
    foreach ($users as $user) {
        $tokens = get_user_meta($user->ID, 'plaza_tokens', true);
        if (!is_array($tokens)) {
            continue;
        }
        
        foreach ($tokens as $token_data) {
            if (isset($token_data['token']) && $token_data['token'] === $token) {
                $found_user = $user;
                $found_token_data = $token_data;
                break 2;
            }
        }
    }
    
    if (!$found_user) {
        return new WP_REST_Response(
            array('success' => false, 'message' => 'Token inválido'),
            401
        );
    }
    
    $user_id = $found_user->ID;
    
    // Verificar permisos
    $is_admin = user_can($user_id, 'administrator');
    $is_shop_manager = user_can($user_id, 'manage_woocommerce');
    
    if (!$is_admin && !$is_shop_manager) {
        return new WP_REST_Response(
            array('success' => false, 'message' => 'Se requiere rol de Administrator o Shop Manager'),
            403
        );
    }
    
    $response = new WP_REST_Response(array(
        'success' => true,
        'token' => $token, // Devolver el mismo token (permanente)
        'baseUrl' => home_url(),
        'email' => $found_user->user_email,
        'userId' => $user_id,
        'username' => $found_user->user_login,
        'token_name' => isset($found_token_data['name']) ? $found_token_data['name'] : 'Token'
    ));
    
    return $response;
}

/**
 * Login directo con usuario/contraseña (alternativa)
 */
function plaza_direct_login($request) {
    // Agregar headers CORS
    plaza_add_cors_headers();
    
    $username = $request->get_param('username');
    $password = $request->get_param('password');
    
    if (empty($username) || empty($password)) {
        return new WP_Error('missing_params', 'Usuario y contraseña requeridos', array('status' => 400));
    }
    
    // Validar credenciales con WordPress
    $user = wp_authenticate($username, $password);
    
    if (is_wp_error($user)) {
        return new WP_Error('invalid_credentials', 'Usuario o contraseña incorrectos', array('status' => 401));
    }
    
    // Verificar permisos (Administrator o Shop Manager)
    // Verificar primero si es administrator
    $is_admin = user_can($user->ID, 'administrator');
    $is_shop_manager = user_can($user->ID, 'manage_woocommerce');
    
    if (!$is_admin && !$is_shop_manager) {
        return new WP_Error('insufficient_permissions', 'Se requiere rol de Administrator o Shop Manager', array('status' => 403));
    }
    
    // Generar token simple
    $token = wp_generate_password(32, false, false);
    $expires = time() + (30 * 24 * 60 * 60); // 30 días
    
    update_user_meta($user->ID, 'plaza_token', $token);
    update_user_meta($user->ID, 'plaza_token_expires', $expires);
    
    return array(
        'success' => true,
        'token' => $token,
        'baseUrl' => home_url(),
        'email' => $user->user_email,
        'userId' => $user->ID,
        'username' => $user->user_login
    );
}

/**
 * Obtener token desde sesión de WordPress (para Nextend Social Login)
 * Cuando un usuario inicia sesión con Nextend, puede llamar este endpoint
 * para obtener un token para usar en la REST API
 */
function plaza_get_token_from_session($request) {
    // Verificar si hay un usuario logueado en WordPress
    $current_user_id = get_current_user_id();
    
    if (!$current_user_id) {
        return new WP_Error('not_logged_in', 'No hay sesión activa. Por favor, inicia sesión primero con Nextend Social Login.', array('status' => 401));
    }
    
    $user = get_userdata($current_user_id);
    
    // Verificar permisos
    if (!user_can($current_user_id, 'manage_woocommerce') && !user_can($current_user_id, 'administrator')) {
        return new WP_Error('insufficient_permissions', 'Se requiere rol de Administrator o Shop Manager', array('status' => 403));
    }
    
    // Verificar si ya tiene un token válido
    $existing_token = get_user_meta($current_user_id, 'plaza_token', true);
    $expires = get_user_meta($current_user_id, 'plaza_token_expires', true);
    
    // Si tiene token válido, devolverlo
    if ($existing_token && $expires && time() < $expires) {
        return array(
            'success' => true,
            'token' => $existing_token,
            'baseUrl' => home_url(),
            'email' => $user->user_email,
            'userId' => $current_user_id,
            'username' => $user->user_login,
            'from_nextend' => true
        );
    }
    
    // Generar nuevo token
    $token = wp_generate_password(32, false, false);
    $expires = time() + (30 * 24 * 60 * 60); // 30 días
    
    update_user_meta($current_user_id, 'plaza_token', $token);
    update_user_meta($current_user_id, 'plaza_token_expires', $expires);
    
    return array(
        'success' => true,
        'token' => $token,
        'baseUrl' => home_url(),
        'email' => $user->user_email,
        'userId' => $current_user_id,
        'username' => $user->user_login,
        'from_nextend' => true
    );
}


/**
 * Autenticación con Google OAuth
 */
function plaza_google_auth($request) {
    $code = $request->get_param('code');
    $redirect_uri = $request->get_param('redirect_uri');
    
    if (empty($code) || empty($redirect_uri)) {
        return new WP_Error('missing_params', 'Código y redirect_uri requeridos', array('status' => 400));
    }
    
    $client_id = get_option('plaza_google_client_id', '');
    $client_secret = get_option('plaza_google_client_secret', '');
    
    if (empty($client_id) || empty($client_secret)) {
        return new WP_Error('not_configured', 'Google OAuth no configurado', array('status' => 500));
    }
    
    // Intercambiar código por token
    $response = wp_remote_post('https://oauth2.googleapis.com/token', array(
        'body' => array(
            'code' => $code,
            'client_id' => $client_id,
            'client_secret' => $client_secret,
            'redirect_uri' => $redirect_uri,
            'grant_type' => 'authorization_code'
        ),
        'timeout' => 30
    ));
    
    if (is_wp_error($response)) {
        return new WP_Error('token_failed', $response->get_error_message(), array('status' => 500));
    }
    
    $data = json_decode(wp_remote_retrieve_body($response), true);
    
    if (wp_remote_retrieve_response_code($response) !== 200 || !isset($data['access_token'])) {
        return new WP_Error('token_failed', 'Error obteniendo token de Google', array('status' => 500));
    }
    
    // Obtener información del usuario
    $user_response = wp_remote_get('https://www.googleapis.com/oauth2/v2/userinfo', array(
        'headers' => array('Authorization' => 'Bearer ' . $data['access_token']),
        'timeout' => 30
    ));
    
    if (is_wp_error($user_response)) {
        return new WP_Error('user_failed', $user_response->get_error_message(), array('status' => 500));
    }
    
    $user_data = json_decode(wp_remote_retrieve_body($user_response), true);
    
    if (!isset($user_data['email'])) {
        return new WP_Error('user_failed', 'No se pudo obtener email', array('status' => 500));
    }
    
    // Buscar usuario en WordPress
    $user = get_user_by('email', $user_data['email']);
    if (!$user) {
        return new WP_Error('user_not_found', 'Usuario no registrado', array('status' => 404));
    }
    
    // Generar token simple
    $token = wp_generate_password(32, false, false);
    $expires = time() + (30 * 24 * 60 * 60);
    
    update_user_meta($user->ID, 'plaza_token', $token);
    update_user_meta($user->ID, 'plaza_token_expires', $expires);
    
    return array(
        'success' => true,
        'token' => $token,
        'baseUrl' => home_url(),
        'email' => $user_data['email'],
        'userId' => $user->ID,
        'username' => $user->user_login
    );
}

/**
 * Verificar permisos
 */
function plaza_check_permissions() {
    $headers = array();
    foreach ($_SERVER as $key => $value) {
        if (substr($key, 0, 5) === 'HTTP_') {
            $header = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
            $headers[$header] = $value;
        }
    }
    
    $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : 
                   (isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '');
    
    if (empty($auth_header) || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        return new WP_Error('unauthorized', 'Token requerido', array('status' => 401));
    }
    
    $token = $matches[1];
    
    // Buscar token en tokens personalizados
    $users = get_users(array(
        'meta_key' => 'plaza_tokens',
        'number' => -1
    ));
    
    $found_user = null;
    
    foreach ($users as $user) {
        $tokens = get_user_meta($user->ID, 'plaza_tokens', true);
        if (!is_array($tokens)) {
            continue;
        }
        
        foreach ($tokens as $token_data) {
            if (isset($token_data['token']) && $token_data['token'] === $token) {
                $found_user = $user;
                break 2;
            }
        }
    }
    
    if (!$found_user) {
        return new WP_Error('unauthorized', 'Token inválido', array('status' => 401));
    }
    
    $user = $found_user;
    
    wp_set_current_user($user->ID);
    
    if (!current_user_can('upload_files')) {
        return new WP_Error('forbidden', 'Sin permisos', array('status' => 403));
    }
    
    return true;
}

/**
 * Subir imagen
 */
function plaza_upload_image($request) {
    $file_data = $request->get_param('file');
    $filename = $request->get_param('filename') ?: 'image.jpg';
    
    if (!preg_match('/^data:image\/(\w+);base64,/', $file_data, $matches)) {
        return new WP_Error('invalid_format', 'Formato inválido', array('status' => 400));
    }
    
    $image_type = $matches[1];
    $file_data = base64_decode(preg_replace('/^data:image\/\w+;base64,/', '', $file_data));
    
    if ($file_data === false) {
        return new WP_Error('decode_error', 'Error decodificando', array('status' => 400));
    }
    
    $upload_dir = wp_upload_dir();
    $unique_filename = wp_unique_filename($upload_dir['path'], $filename);
    $file_path = $upload_dir['path'] . '/' . $unique_filename;
    
    file_put_contents($file_path, $file_data);
    
    if (@getimagesize($file_path) === false) {
        @unlink($file_path);
        return new WP_Error('invalid_image', 'No es imagen válida', array('status' => 400));
    }
    
    $attach_id = wp_insert_attachment(array(
        'post_mime_type' => 'image/' . $image_type,
        'post_title' => sanitize_file_name(pathinfo($unique_filename, PATHINFO_FILENAME)),
        'post_content' => '',
        'post_status' => 'inherit'
    ), $file_path);
    
    if (is_wp_error($attach_id)) {
        @unlink($file_path);
        return new WP_Error('upload_failed', 'Error subiendo', array('status' => 500));
    }
    
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    wp_update_attachment_metadata($attach_id, wp_generate_attachment_metadata($attach_id, $file_path));
    
    return array(
        'success' => true,
        'url' => wp_get_attachment_url($attach_id),
        'id' => $attach_id
    );
}
