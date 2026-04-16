-- Diagnóstico completo del equipo EQ-00

-- 1. Ver el código exacto byte por byte (para detectar espacios invisibles)
SELECT 
    codigo,
    LENGTH(codigo) as longitud,
    OCTET_LENGTH(codigo) as bytes,
    ENCODE(codigo::bytea, 'hex') as hex_representation,
    CASE WHEN codigo ~ '^[A-Z]{2}-[0-9]{2}$' THEN 'FORMATO OK' ELSE 'FORMATO RARO' END as formato
FROM equipos 
WHERE codigo ILIKE '%EQ-00%'
   OR codigo ILIKE '%EQ%'
   OR codigo ~ 'EQ';

-- 2. Ver TODOS los equipos ordenados por código (sin filtro)
SELECT id, codigo, nombre, COALESCE(area, 'NULL') as area, creado_en
FROM equipos 
ORDER BY codigo ASC;

-- 3. Ver equipos donde código contiene 'EQ' (búsqueda parcial)
SELECT id, codigo, nombre, area, estado
FROM equipos 
WHERE codigo LIKE '%EQ%' 
ORDER BY codigo;

-- 4. Ver si hay duplicados de EQ-00
SELECT codigo, COUNT(*) as cantidad, MIN(id) as primer_id, MAX(id) as ultimo_id
FROM equipos 
WHERE codigo ILIKE '%EQ-00%'
GROUP BY codigo;

-- 5. Ver últimos 10 equipos creados (por fecha)
SELECT id, codigo, nombre, creado_en
FROM equipos 
ORDER BY creado_en DESC NULLS LAST
LIMIT 10;

-- 6. Ver si hay equipos con creado_en NULL
SELECT id, codigo, nombre, creado_en
FROM equipos 
WHERE creado_en IS NULL;
