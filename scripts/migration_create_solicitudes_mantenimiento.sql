-- Crear tabla para guardar las solicitudes de mantenimiento
-- Ejecutar en la base de datos: area_mantenimiento

CREATE TABLE IF NOT EXISTS solicitudes_mantenimiento (
  id SERIAL PRIMARY KEY,
  nombre_solicitante TEXT NOT NULL,
  area_equipo TEXT NOT NULL,
  fecha_solicitud DATE NOT NULL,
  departamento_solicitante TEXT NOT NULL,
  otro_departamento TEXT,
  descripcion_solicitud TEXT NOT NULL,
  adjuntos TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado')),
  orden_id INTEGER,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_fecha
  ON solicitudes_mantenimiento (fecha_solicitud DESC);

CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_departamento
  ON solicitudes_mantenimiento (departamento_solicitante);

CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_created_at
  ON solicitudes_mantenimiento (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_orden_id
  ON solicitudes_mantenimiento (orden_id);
