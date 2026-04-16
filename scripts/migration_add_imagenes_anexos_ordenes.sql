-- Migración: Agregar columnas para URLs de imágenes y anexos en ordenes_mantenimiento
-- Ejecutar: psql -d area_mantenimiento -U postgres -f scripts/migration_add_imagenes_anexos_ordenes.sql

ALTER TABLE ordenes_mantenimiento 
ADD COLUMN IF NOT EXISTS imagen_antes_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS imagen_despues_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(500);

-- Comentarios sobre las columnas
COMMENT ON COLUMN ordenes_mantenimiento.imagen_antes_url IS 'URL de la imagen antes del mantenimiento en Google Drive';
COMMENT ON COLUMN ordenes_mantenimiento.imagen_despues_url IS 'URL de la imagen después del mantenimiento en Google Drive';
COMMENT ON COLUMN ordenes_mantenimiento.anexo_url IS 'URL del archivo anexo (PDF, Word, Excel, etc.) en Google Drive';
