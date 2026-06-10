-- Migración: Agregar campo zona y hacer codigo_equipo opcional en ordenes_mantenimiento
-- Ejecutar: psql -d area_mantenimiento -U postgres -f scripts/migration_add_zona_to_ordenes.sql

-- Hacer codigo_equipo nullable
ALTER TABLE ordenes_mantenimiento 
ALTER COLUMN codigo_equipo DROP NOT NULL;

-- Agregar columna zona si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ordenes_mantenimiento' 
        AND column_name = 'zona'
    ) THEN
        ALTER TABLE ordenes_mantenimiento 
        ADD COLUMN zona VARCHAR(500);
    END IF;
END $$;

-- Agregar columnas de imágenes si no existen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ordenes_mantenimiento' 
        AND column_name = 'imagen_antes_url'
    ) THEN
        ALTER TABLE ordenes_mantenimiento 
        ADD COLUMN imagen_antes_url VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ordenes_mantenimiento' 
        AND column_name = 'imagen_despues_url'
    ) THEN
        ALTER TABLE ordenes_mantenimiento 
        ADD COLUMN imagen_despues_url VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ordenes_mantenimiento' 
        AND column_name = 'anexo_url'
    ) THEN
        ALTER TABLE ordenes_mantenimiento 
        ADD COLUMN anexo_url VARCHAR(500);
    END IF;
END $$;

-- Comentarios sobre las columnas
COMMENT ON COLUMN ordenes_mantenimiento.zona IS 'Zona donde se realiza el mantenimiento (cuando no es un equipo específico)';
COMMENT ON COLUMN ordenes_mantenimiento.imagen_antes_url IS 'URL de la imagen antes del mantenimiento en Google Drive';
COMMENT ON COLUMN ordenes_mantenimiento.imagen_despues_url IS 'URL de la imagen después del mantenimiento en Google Drive';
COMMENT ON COLUMN ordenes_mantenimiento.anexo_url IS 'URL del archivo anexo (PDF, Word, Excel, etc.) en Google Drive';
