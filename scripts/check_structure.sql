-- Ver estructura de la tabla equipos_historial
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'equipos_historial'
ORDER BY ordinal_position;

-- Ver estructura de equipos
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'equipos'
ORDER BY ordinal_position;
