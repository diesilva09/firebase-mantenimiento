-- Migración v2: Paradas operativas con modelo padre-hijo
-- Padre: registros_linea_produccion (apertura + cierre)
-- Hijo:  paradas_operativas_detalle (paradas incrementales)
--
-- Aplicar en DEV primero:
--   psql -U postgres -d area_mantenimiento_dev -f scripts/migration_paradas_operativas_v2.sql
-- Luego en PROD (con backup):
--   psql -U postgres -d area_mantenimiento -f scripts/migration_paradas_operativas_v2.sql

CREATE TABLE IF NOT EXISTS registros_linea_produccion (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  linea VARCHAR(100) NOT NULL,
  linea_otra VARCHAR(200),
  turno VARCHAR(50) NOT NULL,
  hora_inicio VARCHAR(5) NOT NULL,
  fin_turno_programado VARCHAR(5) NOT NULL,
  responsable_apertura VARCHAR(200) NOT NULL,
  unidades_programadas INTEGER NOT NULL CHECK (unidades_programadas > 0),
  lote VARCHAR(100) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
  hora_finalizacion VARCHAR(5),
  responsable_cierre VARCHAR(200),
  unidades_reales_totales INTEGER CHECK (unidades_reales_totales IS NULL OR unidades_reales_totales >= 0),
  creado_en TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrado_en TIMESTAMP(6)
);

CREATE TABLE IF NOT EXISTS paradas_operativas_detalle (
  id SERIAL PRIMARY KEY,
  registro_linea_id INTEGER NOT NULL REFERENCES registros_linea_produccion(id) ON DELETE CASCADE,
  hora_inicio VARCHAR(5) NOT NULL,
  hora_fin VARCHAR(5) NOT NULL,
  tiempo_minutos INTEGER NOT NULL CHECK (tiempo_minutos > 0),
  motivo VARCHAR(100) NOT NULL,
  observaciones TEXT,
  unidades_reales INTEGER NOT NULL DEFAULT 0 CHECK (unidades_reales >= 0),
  responsable VARCHAR(200) NOT NULL,
  creado_en TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registros_linea_estado
  ON registros_linea_produccion (estado);

CREATE INDEX IF NOT EXISTS idx_registros_linea_fecha
  ON registros_linea_produccion (fecha);

CREATE INDEX IF NOT EXISTS idx_paradas_detalle_registro
  ON paradas_operativas_detalle (registro_linea_id);
