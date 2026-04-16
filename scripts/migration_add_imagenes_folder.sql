-- Migración: Agregar columna imagenes_folder_id a tabla equipos
-- Ejecutar: psql -d maintenance_db -f scripts/migration_add_imagenes_folder.sql
-- O desde aplicación: await query(`ALTER TABLE equipos ADD COLUMN IF NOT EXISTS imagenes_folder_id VARCHAR(255);`);

ALTER TABLE equipos ADD COLUMN IF NOT EXISTS imagenes_folder_id VARCHAR(255);

-- Comentario sobre la columna
COMMENT ON COLUMN equipos.imagenes_folder_id IS 'ID de la carpeta en Google Drive para imágenes de mantenimiento (antes/después)';
