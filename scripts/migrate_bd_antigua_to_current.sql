-- Migracion pura SQL desde BD_ANTIGUA hacia area_mantenimiento
-- Mantiene la estructura actual y reemplaza solo los datos de las tablas migrables.
-- NO toca: usuarios, notificaciones, notification_subscriptions, archivos, solicitudes_mantenimiento.
--
-- Ejecutar conectado a la base actual: area_mantenimiento
-- Requiere permisos para crear la extension dblink si aun no existe.

CREATE EXTENSION IF NOT EXISTS dblink;

DO $$
DECLARE
  old_conn text := 'host=localhost port=5432 dbname=BD_ANTIGUA user=postgres password=Coruna.26';
  backup_schema text := format('backup_bd_antigua_%s', to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS'));
  truncate_order text[] := ARRAY[
    'tareas_vistas',
    'zonas_historial',
    'equipos_historial',
    'ordenes_mantenimiento',
    'paradas_operativas',
    'repuestos_uso_solicitudes',
    'tareas_cronograma',
    'equipos',
    'repuestos_inventario',
    'repuestos',
    'zonas',
    'spares_requests',
    'maintenance_minutes',
    'equipment_inspections',
    'consumos_servicios'
  ];
  insert_order text[] := ARRAY[
    'consumos_servicios',
    'equipment_inspections',
    'maintenance_minutes',
    'repuestos',
    'repuestos_inventario',
    'spares_requests',
    'zonas',
    'equipos',
    'tareas_cronograma',
    'paradas_operativas',
    'ordenes_mantenimiento',
    'equipos_historial',
    'zonas_historial',
    'tareas_vistas',
    'repuestos_uso_solicitudes'
  ];
  target_table text;
  current_count bigint;
  old_count bigint;
  common_columns text;
  common_columns_with_types text;
  remote_sql text;
  seq_name text;
  max_id bigint;
BEGIN
  IF current_database() <> 'area_mantenimiento' THEN
    RAISE EXCEPTION 'Debes ejecutar este script conectado a la base area_mantenimiento. Base actual: %', current_database();
  END IF;

  IF 'mig_old_db' = ANY(dblink_get_connections()) THEN
    PERFORM dblink_disconnect('mig_old_db');
  END IF;

  PERFORM dblink_connect('mig_old_db', old_conn);

  EXECUTE format('CREATE SCHEMA %I', backup_schema);
  RAISE NOTICE 'Schema de respaldo creado: %', backup_schema;

  -- Respaldo interno de las tablas que se van a reemplazar.
  FOREACH target_table IN ARRAY insert_order LOOP
    EXECUTE format('CREATE TABLE %I.%I AS TABLE public.%I', backup_schema, target_table, target_table);
  END LOOP;

  -- Limpieza de tablas destino, sin tocar usuarios/notificaciones/suscripciones ni tablas nuevas.
  EXECUTE (
    SELECT 'TRUNCATE TABLE ' || string_agg(format('public.%I', t), ', ') || ' RESTART IDENTITY CASCADE'
    FROM unnest(truncate_order) AS t
  );

  -- Insercion de datos desde BD_ANTIGUA usando solo columnas comunes.
  FOREACH target_table IN ARRAY insert_order LOOP
    SELECT string_agg(format('%I', c.column_name), ', ' ORDER BY c.ordinal_position),
           string_agg(format('%I %s', c.column_name, c.data_type), ', ' ORDER BY c.ordinal_position)
      INTO common_columns, common_columns_with_types
    FROM (
      SELECT
        cols.column_name,
        cols.ordinal_position,
        pg_catalog.format_type(att.atttypid, att.atttypmod) AS data_type
      FROM information_schema.columns cols
      JOIN pg_class cls
        ON cls.relname = cols.table_name
       AND cls.relnamespace = 'public'::regnamespace
      JOIN pg_attribute att
        ON att.attrelid = cls.oid
       AND att.attname = cols.column_name
      JOIN dblink(
        'mig_old_db',
        format(
          $sql$
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %L
          $sql$,
          target_table
        )
      ) AS old_cols(column_name text)
        ON old_cols.column_name = cols.column_name
      WHERE cols.table_schema = 'public'
        AND cols.table_name = target_table
      ORDER BY cols.ordinal_position
    ) AS c;

    IF common_columns IS NULL OR common_columns = '' THEN
      RAISE NOTICE 'Saltando %, no hay columnas comunes entre ambas bases.', target_table;
      CONTINUE;
    END IF;

    remote_sql := format('SELECT %s FROM public.%I', common_columns, target_table);

    EXECUTE format(
      'INSERT INTO public.%1$I (%2$s) SELECT %2$s FROM dblink(%3$L, %4$L) AS src(%5$s)',
      target_table,
      common_columns,
      'mig_old_db',
      remote_sql,
      common_columns_with_types
    );

    EXECUTE format('SELECT COUNT(*) FROM public.%I', target_table) INTO current_count;
    EXECUTE format(
      'SELECT count(*) FROM dblink(%L, %L) AS src(total bigint)',
      'mig_old_db',
      format('SELECT COUNT(*) FROM public.%I', target_table)
    ) INTO old_count;

    RAISE NOTICE 'Tabla % migrada. Registros actuales: %, registros antiguos: %', target_table, current_count, old_count;
  END LOOP;

  -- Reajuste de secuencias basadas en la columna id.
  FOREACH target_table IN ARRAY insert_order LOOP
    seq_name := pg_get_serial_sequence(format('public.%I', target_table), 'id');

    IF seq_name IS NOT NULL THEN
      EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM public.%I', target_table) INTO max_id;

      IF max_id > 0 THEN
        EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_id);
      ELSE
        EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
      END IF;
    END IF;
  END LOOP;

  PERFORM dblink_disconnect('mig_old_db');

  RAISE NOTICE 'Migracion completada correctamente.';
  RAISE NOTICE 'Se conservaron sin tocar las tablas: usuarios, notificaciones, notification_subscriptions, archivos, solicitudes_mantenimiento.';
  RAISE NOTICE 'Respaldo disponible dentro de esta misma base en el schema: %', backup_schema;
END
$$;
