-- Agrega el estado a las solicitudes de mantenimiento existentes
-- Ejecutar en la base de datos: area_mantenimiento

ALTER TABLE solicitudes_mantenimiento
  ADD COLUMN IF NOT EXISTS estado TEXT;

UPDATE solicitudes_mantenimiento
SET estado = 'pendiente'
WHERE estado IS NULL;

ALTER TABLE solicitudes_mantenimiento
  ALTER COLUMN estado SET DEFAULT 'pendiente';

ALTER TABLE solicitudes_mantenimiento
  ALTER COLUMN estado SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'solicitudes_mantenimiento_estado_check'
  ) THEN
    ALTER TABLE solicitudes_mantenimiento
      ADD CONSTRAINT solicitudes_mantenimiento_estado_check
      CHECK (estado IN ('pendiente', 'completado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_estado
  ON solicitudes_mantenimiento (estado);
