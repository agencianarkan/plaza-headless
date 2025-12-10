<?php
/**
 * Plugin Name: Plaza Upload Endpoint
 * Description: Endpoint personalizado para subir imágenes desde Plaza
 * Version: 1.0
 * Author: Plaza
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Registrar endpoint personalizado para subir imágenes
 */
add_action('rest_api_init', function() {
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
});

/**
 * Verificar permisos del usuario
 */
function plaza_check_permissions() {
    // Verificar que el usuario esté autenticado
    if (!is_user_logged_in()) {
        return new WP_Error('unauthorized', 'Usuario no autenticado', array('status' => 401));
    }
    
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

