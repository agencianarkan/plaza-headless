<?php
/**
 * Verificar sesión de usuario
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Verificar token de sesión
 * @return array|false Datos del usuario o false si no es válido
 */
function verify_session($token) {
    global $pdo;
    
    if (empty($token)) {
        return false;
    }
    
    try {
        // Buscar sesión activa
        $stmt = $pdo->prepare("
            SELECT s.*, u.id as usuario_id, u.email, u.username, u.nombre, u.tienda_id, u.activa
            FROM sesiones s
            INNER JOIN usuarios_plaza u ON s.usuario_id = u.id
            WHERE s.token = ? 
            AND s.expires_at > NOW()
            AND u.activa = 1
        ");
        $stmt->execute([$token]);
        $sesion = $stmt->fetch();
        
        if ($sesion) {
            return [
                'id' => $sesion['usuario_id'],
                'email' => $sesion['email'],
                'username' => $sesion['username'],
                'nombre' => $sesion['nombre'],
                'tienda_id' => $sesion['tienda_id'],
                'token' => $token
            ];
        }
        
        return false;
    } catch (PDOException $e) {
        error_log("Error verificando sesión: " . $e->getMessage());
        return false;
    }
}

/**
 * Limpiar sesiones expiradas
 */
function clean_expired_sessions() {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("DELETE FROM sesiones WHERE expires_at < NOW()");
        $stmt->execute();
    } catch (PDOException $e) {
        error_log("Error limpiando sesiones: " . $e->getMessage());
    }
}

// Limpiar sesiones expiradas al cargar
clean_expired_sessions();

