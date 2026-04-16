-- Verificar en qué base de datos estamos y qué tablas existen
SELECT current_database() as base_de_datos_actual;
SELECT current_schema() as esquema_actual;
SELECT current_user as usuario_actual;

-- Ver todas las tablas del esquema público
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Ver si existe la tabla equipos y cuántos registros tiene
SELECT COUNT(*) as total_equipos FROM equipos;

-- Ver primeros 5 equipos ordenados por ID
SELECT id, codigo, nombre 
FROM equipos 
ORDER BY id 
LIMIT 5;

-- Ver últimos 5 equipos ordenados por ID
SELECT id, codigo, nombre 
FROM equipos 
ORDER BY id DESC 
LIMIT 5;
