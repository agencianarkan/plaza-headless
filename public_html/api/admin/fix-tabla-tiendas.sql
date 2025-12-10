-- Script para agregar el campo wp_user a la tabla tiendas
-- Ejecuta esto en phpMyAdmin si la tabla no tiene el campo wp_user

ALTER TABLE `tiendas` 
ADD COLUMN `wp_user` VARCHAR(100) NOT NULL AFTER `url`;

-- Si ya existe el campo, este script dará error, pero no pasa nada
-- Solo asegúrate de que la tabla tenga esta estructura:

-- CREATE TABLE `tiendas` (
--   `id` INT(11) NOT NULL AUTO_INCREMENT,
--   `nombre` VARCHAR(255) NOT NULL,
--   `url` VARCHAR(500) NOT NULL,
--   `wp_user` VARCHAR(100) NOT NULL,
--   `app_password_encrypted` TEXT NOT NULL,
--   `activa` TINYINT(1) DEFAULT 1,
--   `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   INDEX `idx_activa` (`activa`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

