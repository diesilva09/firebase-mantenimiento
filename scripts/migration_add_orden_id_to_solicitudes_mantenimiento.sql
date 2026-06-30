-- Agrega el enlace a la orden de mantenimiento creada desde una solicitud
-- Ejecutar en la base de datos: area_mantenimiento

ALTER TABLE solicitudes_mantenimiento
  ADD COLUMN IF NOT EXISTS orden_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_orden_id
  ON solicitudes_mantenimiento (orden_id);
