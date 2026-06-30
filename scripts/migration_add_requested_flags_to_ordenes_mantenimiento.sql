-- Diferencia las órdenes creadas manualmente de las creadas desde solicitudes
-- Ejecutar en la base de datos: area_mantenimiento

ALTER TABLE ordenes_mantenimiento
  ADD COLUMN IF NOT EXISTS origen_orden TEXT;

UPDATE ordenes_mantenimiento
SET origen_orden = 'manual'
WHERE origen_orden IS NULL;

ALTER TABLE ordenes_mantenimiento
  ALTER COLUMN origen_orden SET DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ordenes_mantenimiento_origen_orden_check'
  ) THEN
    ALTER TABLE ordenes_mantenimiento
      ADD CONSTRAINT ordenes_mantenimiento_origen_orden_check
      CHECK (origen_orden IN ('manual', 'solicitada'));
  END IF;
END $$;

ALTER TABLE ordenes_mantenimiento
  ADD COLUMN IF NOT EXISTS solicitud_id INTEGER;

ALTER TABLE ordenes_mantenimiento
  ADD COLUMN IF NOT EXISTS tipo_destino TEXT;

UPDATE ordenes_mantenimiento
SET tipo_destino = CASE
  WHEN codigo_equipo IS NOT NULL THEN 'equipo'
  WHEN zona IS NOT NULL THEN 'locativo'
  ELSE 'otro'
END
WHERE tipo_destino IS NULL;

ALTER TABLE ordenes_mantenimiento
  ALTER COLUMN tipo_destino SET DEFAULT 'equipo';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ordenes_mantenimiento_tipo_destino_check'
  ) THEN
    ALTER TABLE ordenes_mantenimiento
      ADD CONSTRAINT ordenes_mantenimiento_tipo_destino_check
      CHECK (tipo_destino IN ('equipo', 'locativo', 'otro'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ordenes_mantenimiento_origen_orden
  ON ordenes_mantenimiento (origen_orden);

CREATE INDEX IF NOT EXISTS idx_ordenes_mantenimiento_solicitud_id
  ON ordenes_mantenimiento (solicitud_id);
