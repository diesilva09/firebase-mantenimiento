-- Ver TODOS los registros de equipos_historial con su ID
-- (así puedes ver en qué posición está el de EQ-00)
SELECT 
    id,
    codigo_equipo,
    LEFT(labor, 30) as labor_resumen,
    fecha_evento
FROM equipos_historial 
ORDER BY id ASC;

-- Contar cuántos registros hay antes del de EQ-00
SELECT COUNT(*) as registros_antes_eq00 
FROM equipos_historial 
WHERE id < 160;
