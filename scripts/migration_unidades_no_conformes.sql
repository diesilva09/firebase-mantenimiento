-- Unidades no conformes en paradas y totales al cierre
--
-- DEV:
--   psql -U postgres -d area_mantenimiento_dev -f scripts/migration_unidades_no_conformes.sql
-- PROD:
--   psql -U postgres -d area_mantenimiento -f scripts/migration_unidades_no_conformes.sql

ALTER TABLE paradas_operativas_detalle
  ADD COLUMN IF NOT EXISTS unidades_no_conformes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE paradas_operativas_detalle
  DROP CONSTRAINT IF EXISTS paradas_operativas_detalle_unidades_no_conformes_check;

ALTER TABLE paradas_operativas_detalle
  ADD CONSTRAINT paradas_operativas_detalle_unidades_no_conformes_check
  CHECK (unidades_no_conformes >= 0);

ALTER TABLE registros_linea_produccion
  ADD COLUMN IF NOT EXISTS unidades_no_conformes_totales INTEGER;

ALTER TABLE registros_linea_produccion
  DROP CONSTRAINT IF EXISTS registros_linea_produccion_unidades_no_conformes_totales_check;

ALTER TABLE registros_linea_produccion
  ADD CONSTRAINT registros_linea_produccion_unidades_no_conformes_totales_check
  CHECK (unidades_no_conformes_totales IS NULL OR unidades_no_conformes_totales >= 0);

-- Backfill cierres existentes: suma de paradas (0 si no hay paradas)
UPDATE registros_linea_produccion r
SET unidades_no_conformes_totales = COALESCE(
  (
    SELECT SUM(p.unidades_no_conformes)
    FROM paradas_operativas_detalle p
    WHERE p.registro_linea_id = r.id
  ),
  0
)
WHERE r.estado = 'cerrado' AND r.unidades_no_conformes_totales IS NULL;
