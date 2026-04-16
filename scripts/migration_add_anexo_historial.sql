-- Migración: Agregar columna para URL de anexo en equipos_historial
-- Ejecutar: psql -d area_mantenimiento -U postgres -f scripts/migration_add_anexo_historial.sql

ALTER TABLE equipos_historial 
ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(500);

-- Comentario sobre la columna
COMMENT ON COLUMN equipos_historial.anexo_url IS 'URL del archivo anexo (PDF, Word, Excel, etc.) en Google Drive';
