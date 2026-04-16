-- 1. Total de equipos
SELECT COUNT(*) as total_equipos FROM equipos;

-- 2. Buscar EQ-00 directamente por ID
SELECT id, codigo, nombre, area, estado FROM equipos WHERE id = 317;

-- 3. Ver equipos en posición 315-320 (alrededor de EQ-00)
SELECT id, codigo, nombre 
FROM equipos 
WHERE id BETWEEN 315 AND 320
ORDER BY id;

-- 4. Ver si equipos_historial existe y tiene registros para EQ-00
-- (usando el campo correcto que encontraremos)
SELECT * FROM equipos_historial 
WHERE codigo_equipo = 'EQ-00' 
   OR equipo_codigo = 'EQ-00'
   OR equipo_id = 317
LIMIT 5;
