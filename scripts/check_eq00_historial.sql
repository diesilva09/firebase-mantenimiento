-- Ver registros de hoja de vida para EQ-00
SELECT 
    id,
    codigo_equipo,
    fecha_evento,
    labor,
    tipo_mantenimiento,
    repuestos_usados,
    observaciones,
    ejecutado_por,
    created_at
FROM equipos_historial 
WHERE codigo_equipo = 'EQ-00'
ORDER BY fecha_evento DESC;

-- Contar cuántos registros tiene EQ-00
SELECT COUNT(*) as total_registros_eq00 
FROM equipos_historial 
WHERE codigo_equipo = 'EQ-00';

-- Ver total de registros en equipos_historial
SELECT COUNT(*) as total_historial FROM equipos_historial;
