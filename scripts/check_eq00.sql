-- Verificar el estado real del equipo EQ-00 en la base de datos
SELECT 
    id, 
    codigo, 
    nombre, 
    COALESCE(area, 'NULL') as area,
    COALESCE(linea, 'NULL') as linea,
    COALESCE(estado, 'NULL') as estado,
    creado_en,
    actualizado_en
FROM equipos 
WHERE codigo = 'EQ-00';

-- Contar cuántos equipos hay en total
SELECT COUNT(*) as total_equipos FROM equipos;

-- Ver equipos sin área asignada (podrían estar en 'Otros')
SELECT id, codigo, nombre, COALESCE(area, 'NULL') as area, COALESCE(estado, 'NULL') as estado 
FROM equipos 
WHERE area IS NULL OR area = '' OR area = 'conservas';

-- Ver todos los estados distintos que existen
SELECT DISTINCT COALESCE(estado, 'NULL') as estado, COUNT(*) as cantidad 
FROM equipos 
GROUP BY estado;

-- Ver equipos con codigo similar a EQ
SELECT id, codigo, nombre, COALESCE(area, 'NULL') as area 
FROM equipos 
WHERE codigo LIKE 'EQ%' 
ORDER BY codigo;
