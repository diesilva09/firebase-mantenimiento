-- Agrega distintivos para identificar mantenimientos provenientes de solicitudes
-- Ejecutar en la base de datos: area_mantenimiento

ALTER TABLE equipos_historial
  ADD COLUMN IF NOT EXISTS es_solicitada BOOLEAN;

UPDATE equipos_historial
SET es_solicitada = FALSE
WHERE es_solicitada IS NULL;

ALTER TABLE equipos_historial
  ALTER COLUMN es_solicitada SET DEFAULT FALSE;

ALTER TABLE equipos_historial
  ADD COLUMN IF NOT EXISTS solicitud_id INTEGER;

ALTER TABLE equipos_historial
  ADD COLUMN IF NOT EXISTS origen_orden TEXT;

UPDATE equipos_historial
SET origen_orden = CASE
  WHEN es_solicitada THEN 'solicitada'
  ELSE 'manual'
END
WHERE origen_orden IS NULL;

ALTER TABLE equipos_historial
  ALTER COLUMN origen_orden SET DEFAULT 'manual';

ALTER TABLE zonas_historial
  ADD COLUMN IF NOT EXISTS es_solicitada BOOLEAN;

UPDATE zonas_historial
SET es_solicitada = FALSE
WHERE es_solicitada IS NULL;

ALTER TABLE zonas_historial
  ALTER COLUMN es_solicitada SET DEFAULT FALSE;

ALTER TABLE zonas_historial
  ADD COLUMN IF NOT EXISTS solicitud_id INTEGER;

ALTER TABLE zonas_historial
  ADD COLUMN IF NOT EXISTS origen_orden TEXT;

UPDATE zonas_historial
SET origen_orden = CASE
  WHEN es_solicitada THEN 'solicitada'
  ELSE 'manual'
END
WHERE origen_orden IS NULL;

ALTER TABLE zonas_historial
  ALTER COLUMN origen_orden SET DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_equipos_historial_es_solicitada
  ON equipos_historial (es_solicitada);

CREATE INDEX IF NOT EXISTS idx_zonas_historial_es_solicitada
  ON zonas_historial (es_solicitada);
