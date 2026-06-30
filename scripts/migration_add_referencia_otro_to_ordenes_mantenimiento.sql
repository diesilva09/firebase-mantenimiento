-- Agrega una referencia propia para las órdenes tipo "Otro"
-- Ejecutar en la base de datos: area_mantenimiento

ALTER TABLE ordenes_mantenimiento
  ADD COLUMN IF NOT EXISTS referencia_otro TEXT;

UPDATE ordenes_mantenimiento
SET referencia_otro = zona
WHERE tipo_destino = 'otro'
  AND referencia_otro IS NULL
  AND zona IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ordenes_mantenimiento_referencia_otro
  ON ordenes_mantenimiento (referencia_otro);
