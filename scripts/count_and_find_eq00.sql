-- Ver cuántos equipos hay en TOTAL
SELECT COUNT(*) as total_equipos FROM equipos;

-- Ver en qué posición está EQ-00 cuando ordenamos por ID
SELECT 
    ROW_NUMBER() OVER (ORDER BY id) as posicion,
    id, 
    codigo, 
    nombre
FROM equipos 
ORDER BY id;

-- Buscar específicamente EQ-00 sin filtro de código
SELECT * FROM equipos WHERE id = 317;

-- Ver si hay más equipos con ID mayor a 317
SELECT COUNT(*) as equipos_despues_317 
FROM equipos 
WHERE id > 317;

-- Para equipos_historial - ver si hay registros para EQ-00
SELECT COUNT(*) as total_historial_eq00 
FROM equipos_historial 
WHERE equipo_codigo = 'EQ-00';

-- Ver todos los registros de historial para EQ-00
SELECT * FROM equipos_historial 
WHERE equipo_codigo = 'EQ-00'
ORDER BY fecha DESC;
