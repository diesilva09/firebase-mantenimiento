-- Catálogo de líneas personalizadas (opción B)
-- Se alimenta automáticamente al registrar aperturas con línea "OTRA"
--
-- Aplicar en DEV:
--   psql -U postgres -d area_mantenimiento_dev -f scripts/migration_lineas_personalizadas.sql

CREATE TABLE IF NOT EXISTS lineas_personalizadas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  nombre_normalizado VARCHAR(200) NOT NULL,
  creado_en TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activa BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT lineas_personalizadas_nombre_normalizado_key UNIQUE (nombre_normalizado)
);

CREATE INDEX IF NOT EXISTS idx_lineas_personalizadas_activa
  ON lineas_personalizadas (activa);

-- Backfill desde registros existentes con línea OTRA
INSERT INTO lineas_personalizadas (nombre, nombre_normalizado)
SELECT DISTINCT TRIM(linea_otra), LOWER(TRIM(linea_otra))
FROM registros_linea_produccion
WHERE linea = 'OTRA'
  AND linea_otra IS NOT NULL
  AND TRIM(linea_otra) <> ''
ON CONFLICT (nombre_normalizado) DO NOTHING;
