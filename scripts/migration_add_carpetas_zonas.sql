-- Migración: Agregar columnas para URLs de carpetas de imágenes y anexos en zonas
-- Ejecutar: psql -d area_mantenimiento -U postgres -f scripts/migration_add_carpetas_zonas.sql

ALTER TABLE zonas 
ADD COLUMN IF NOT EXISTS imagenes_folder_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS attachments_url VARCHAR(500);

-- Comentarios sobre las columnas
COMMENT ON COLUMN zonas.imagenes_folder_url IS 'URL de la carpeta de imágenes de evidencia en Google Drive';
COMMENT ON COLUMN zonas.attachments_url IS 'URL de la carpeta de archivos anexos en Google Drive';
