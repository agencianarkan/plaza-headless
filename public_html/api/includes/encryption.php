<?php
/**
 * Funciones para encriptar/desencriptar credenciales
 * IMPORTANTE: Cambia esta clave por una segura y guárdala en un lugar seguro
 */

// Clave de encriptación (32 caracteres mínimo para AES-256)
// CAMBIA ESTA CLAVE por una generada aleatoriamente
define('ENCRYPTION_KEY', 'cambiar_por_clave_segura_32_caracteres_minimo_12345678901234567890123456789012');

// Método de encriptación
define('ENCRYPTION_METHOD', 'AES-256-CBC');

/**
 * Encriptar credencial
 */
function encrypt_credential($data) {
    if (empty($data)) {
        return '';
    }
    
    $iv_length = openssl_cipher_iv_length(ENCRYPTION_METHOD);
    $iv = openssl_random_pseudo_bytes($iv_length);
    $encrypted = openssl_encrypt($data, ENCRYPTION_METHOD, ENCRYPTION_KEY, 0, $iv);
    
    return base64_encode($encrypted . '::' . base64_encode($iv));
}

/**
 * Desencriptar credencial
 */
function decrypt_credential($data) {
    if (empty($data)) {
        return false;
    }
    
    try {
        $decoded = base64_decode($data, true);
        if ($decoded === false) {
            error_log("Error: No se pudo decodificar base64");
            return false;
        }
        
        if (strpos($decoded, '::') === false) {
            error_log("Error: Formato de encriptación inválido (no contiene '::')");
            return false;
        }
        
        list($encrypted_data, $iv_encoded) = explode('::', $decoded, 2);
        
        if (empty($encrypted_data) || empty($iv_encoded)) {
            error_log("Error: Datos de encriptación vacíos después de separar");
            return false;
        }
        
        $iv = base64_decode($iv_encoded, true);
        if ($iv === false) {
            error_log("Error: No se pudo decodificar IV");
            return false;
        }
        
        $decrypted = openssl_decrypt($encrypted_data, ENCRYPTION_METHOD, ENCRYPTION_KEY, 0, $iv);
        
        if ($decrypted === false) {
            error_log("Error: openssl_decrypt falló");
            return false;
        }
        
        return $decrypted;
    } catch (Exception $e) {
        error_log("Error en decrypt_credential: " . $e->getMessage());
        return false;
    }
}

