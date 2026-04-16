-- Ver SOLO la estructura de equipos_historial
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'equipos_historial'
ORDER BY ordinal_position;
