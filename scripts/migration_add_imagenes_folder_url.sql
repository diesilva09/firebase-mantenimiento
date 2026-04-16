-- Migración: Agregar columna imagenes_folder_url a tabla equipos
-- Ejecutar: psql -d area_mantenimiento -U postgres -f scripts/migration_add_imagenes_folder_url.sql

ALTER TABLE equipos ADD COLUMN IF NOT EXISTS imagenes_folder_url VARCHAR(500);

-- Comentario sobre la columna
COMMENT ON COLUMN equipos.imagenes_folder_url IS 'URL de la carpeta en Google Drive para imágenes de mantenimiento (antes/después)';
