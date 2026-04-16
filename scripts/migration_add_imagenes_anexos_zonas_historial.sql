-- Migración: Agregar columnas para URLs de imágenes y anexos en zonas_historial
-- Ejecutar: psql -d area_mantenimiento -U postgres -f scripts/migration_add_imagenes_anexos_zonas_historial.sql

ALTER TABLE zonas_historial 
ADD COLUMN IF NOT EXISTS imagen_antes_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS imagen_despues_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(500);

-- Comentarios sobre las columnas
COMMENT ON COLUMN zonas_historial.imagen_antes_url IS 'URL de la imagen antes del mantenimiento en Google Drive';
COMMENT ON COLUMN zonas_historial.imagen_despues_url IS 'URL de la imagen después del mantenimiento en Google Drive';
COMMENT ON COLUMN zonas_historial.anexo_url IS 'URL del archivo anexo (PDF, Word, Excel, etc.) en Google Drive';
