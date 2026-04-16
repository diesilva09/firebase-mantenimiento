-- Ver área y estado exacto del EQ-00
SELECT 
    id, 
    codigo, 
    nombre, 
    COALESCE(area, 'NULL') as area,
    COALESCE(linea, 'NULL') as linea,
    COALESCE(estado, 'NULL') as estado,
    creado_en
FROM equipos 
WHERE id = 317;
