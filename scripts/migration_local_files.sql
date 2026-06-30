-- Migración para almacenamiento local de archivos en base de datos PostgreSQL

-- 1. Crear tabla para almacenar archivos binarios
CREATE TABLE IF NOT EXISTS archivos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    contenido BYTEA NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios sobre la tabla archivos
COMMENT ON TABLE archivos IS 'Tabla para guardar imágenes y documentos adjuntos de mantenimiento localmente';
COMMENT ON COLUMN archivos.contenido IS 'Contenido binario del archivo (imagen o documento)';

-- 2. Alterar las columnas de URLs a tipo TEXT en las tablas principales
-- Esto asegura que quepan múltiples URLs locales separadas por comas sin problemas de longitud.

-- Tabla tareas_cronograma (imagen_antes, imagen_despues)
ALTER TABLE tareas_cronograma 
ALTER COLUMN imagen_antes TYPE TEXT,
ALTER COLUMN imagen_despues TYPE TEXT;

-- Tabla equipos_historial (imagen_antes_url, imagen_despues_url, anexo_url)
ALTER TABLE equipos_historial 
ALTER COLUMN imagen_antes_url TYPE TEXT,
ALTER COLUMN imagen_despues_url TYPE TEXT,
ALTER COLUMN anexo_url TYPE TEXT;

-- Tabla zonas_historial (imagen_antes_url, imagen_despues_url, anexo_url)
ALTER TABLE zonas_historial 
ALTER COLUMN imagen_antes_url TYPE TEXT,
ALTER COLUMN imagen_despues_url TYPE TEXT,
ALTER COLUMN anexo_url TYPE TEXT;

-- Tabla ordenes_mantenimiento (imagen_antes_url, imagen_despues_url, anexo_url)
ALTER TABLE ordenes_mantenimiento 
ALTER COLUMN imagen_antes_url TYPE TEXT,
ALTER COLUMN imagen_despues_url TYPE TEXT,
ALTER COLUMN anexo_url TYPE TEXT;
