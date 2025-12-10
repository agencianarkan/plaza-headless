<?php
/**
 * API para gestión de usuarios (CRUD)
 */

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'listar':
            $stmt = $pdo->query("
                SELECT u.*, t.nombre as tienda_nombre 
                FROM usuarios_plaza u
                LEFT JOIN tiendas t ON u.tienda_id = t.id
                ORDER BY u.id DESC
            ");
            $usuarios = $stmt->fetchAll();
            echo json_encode(['success' => true, 'usuarios' => $usuarios]);
            break;
            
        case 'obtener':
            $id = $_GET['id'] ?? 0;
            $stmt = $pdo->prepare("SELECT * FROM usuarios_plaza WHERE id = ?");
            $stmt->execute([$id]);
            $usuario = $stmt->fetch();
            
            if ($usuario) {
                // No devolver el hash de la contraseña
                unset($usuario['password_hash']);
                echo json_encode(['success' => true, 'usuario' => $usuario]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
            }
            break;
            
        case 'eliminar':
            $id = $_GET['id'] ?? 0;
            $stmt = $pdo->prepare("DELETE FROM usuarios_plaza WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
            
        default:
            // Crear o actualizar
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? 0;
            $email = $input['email'] ?? '';
            $username = $input['username'] ?? '';
            $nombre = $input['nombre'] ?? '';
            $password = $input['password'] ?? '';
            $tienda_id = $input['tienda_id'] ?? 0;
            
            if (empty($email) || empty($tienda_id)) {
                echo json_encode(['success' => false, 'error' => 'Email y tienda son requeridos']);
                break;
            }
            
            // Verificar que la tienda existe
            $stmt = $pdo->prepare("SELECT id FROM tiendas WHERE id = ?");
            $stmt->execute([$tienda_id]);
            if (!$stmt->fetch()) {
                echo json_encode(['success' => false, 'error' => 'Tienda no encontrada']);
                break;
            }
            
            if ($id > 0) {
                // Actualizar
                if (!empty($password)) {
                    if (strlen($password) < 6) {
                        echo json_encode(['success' => false, 'error' => 'La contraseña debe tener al menos 6 caracteres']);
                        break;
                    }
                    $password_hash = password_hash($password, PASSWORD_BCRYPT);
                    $stmt = $pdo->prepare("
                        UPDATE usuarios_plaza 
                        SET email = ?, username = ?, nombre = ?, password_hash = ?, tienda_id = ?, updated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([$email, $username, $nombre, $password_hash, $tienda_id, $id]);
                } else {
                    $stmt = $pdo->prepare("
                        UPDATE usuarios_plaza 
                        SET email = ?, username = ?, nombre = ?, tienda_id = ?, updated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([$email, $username, $nombre, $tienda_id, $id]);
                }
            } else {
                // Crear
                if (empty($password)) {
                    echo json_encode(['success' => false, 'error' => 'Contraseña es requerida para nuevos usuarios']);
                    break;
                }
                
                if (strlen($password) < 6) {
                    echo json_encode(['success' => false, 'error' => 'La contraseña debe tener al menos 6 caracteres']);
                    break;
                }
                
                // Verificar que el email no exista
                $stmt = $pdo->prepare("SELECT id FROM usuarios_plaza WHERE email = ?");
                $stmt->execute([$email]);
                if ($stmt->fetch()) {
                    echo json_encode(['success' => false, 'error' => 'El email ya está registrado']);
                    break;
                }
                
                $password_hash = password_hash($password, PASSWORD_BCRYPT);
                $stmt = $pdo->prepare("
                    INSERT INTO usuarios_plaza (email, username, nombre, password_hash, tienda_id) 
                    VALUES (?, ?, ?, ?, ?)
                ");
                $stmt->execute([$email, $username, $nombre, $password_hash, $tienda_id]);
            }
            
            echo json_encode(['success' => true]);
            break;
    }
} catch (PDOException $e) {
    error_log("Error en usuarios.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Error interno del servidor']);
}

