#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

CURRENT_DATABASE_URL="${DATABASE_URL:-}"
if [[ -z "$CURRENT_DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL no esta configurada." >&2
  exit 1
fi

OLD_DATABASE_URL="${OLD_DATABASE_URL:-${CURRENT_DATABASE_URL%/*}/BD_ANTIGUA}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$ROOT_DIR/backups/migracion_bd_antigua_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

TABLES=(
  consumos_servicios
  equipment_inspections
  equipos
  equipos_historial
  maintenance_minutes
  ordenes_mantenimiento
  paradas_operativas
  repuestos
  repuestos_inventario
  repuestos_uso_solicitudes
  spares_requests
  tareas_cronograma
  tareas_vistas
  zonas
  zonas_historial
)

TRUNCATE_ORDER=(
  tareas_vistas
  zonas_historial
  equipos_historial
  ordenes_mantenimiento
  paradas_operativas
  repuestos_uso_solicitudes
  tareas_cronograma
  equipos
  repuestos_inventario
  repuestos
  zonas
  spares_requests
  maintenance_minutes
  equipment_inspections
  consumos_servicios
)

TABLE_ARGS=()
for table in "${TABLES[@]}"; do
  TABLE_ARGS+=("--table=public.$table")
done

TRUNCATE_SQL="$BACKUP_DIR/01_truncate_target_tables.sql"
{
  echo "BEGIN;"
  echo -n "TRUNCATE TABLE "
  for i in "${!TRUNCATE_ORDER[@]}"; do
    table="${TRUNCATE_ORDER[$i]}"
    if [[ "$i" -gt 0 ]]; then
      echo -n ", "
    fi
    echo -n "public.$table"
  done
  echo " RESTART IDENTITY CASCADE;"
  echo "COMMIT;"
} > "$TRUNCATE_SQL"

SEQUENCE_SQL="$BACKUP_DIR/03_reset_sequences.sql"
cat > "$SEQUENCE_SQL" <<'SQL'
DO $$
DECLARE
  tbl text;
  seq_name text;
  max_id bigint;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'consumos_servicios',
    'equipment_inspections',
    'equipos',
    'equipos_historial',
    'maintenance_minutes',
    'ordenes_mantenimiento',
    'paradas_operativas',
    'repuestos',
    'repuestos_inventario',
    'repuestos_uso_solicitudes',
    'spares_requests',
    'tareas_cronograma',
    'tareas_vistas',
    'zonas',
    'zonas_historial'
  ]
  LOOP
    seq_name := pg_get_serial_sequence(format('public.%I', tbl), 'id');
    IF seq_name IS NOT NULL THEN
      EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM public.%I', tbl) INTO max_id;
      IF max_id > 0 THEN
        EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_id);
      ELSE
        EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
      END IF;
    END IF;
  END LOOP;
END $$;
SQL

DUMP_SQL="$BACKUP_DIR/02_bd_antigua_data.sql"
VERIFY_SQL="$BACKUP_DIR/04_verify_counts.sql"
{
  for table in "${TABLES[@]}"; do
    echo "SELECT '$table' AS tabla, COUNT(*) AS total FROM public.$table;"
  done
} > "$VERIFY_SQL"

echo "==> Respaldo completo de la base actual..."
pg_dump "$CURRENT_DATABASE_URL" -F c -f "$BACKUP_DIR/00_area_mantenimiento_before.dump"

echo "==> Exportando datos de BD_ANTIGUA..."
pg_dump "$OLD_DATABASE_URL" \
  --data-only \
  --column-inserts \
  --disable-triggers \
  --no-owner \
  --no-privileges \
  "${TABLE_ARGS[@]}" \
  -f "$DUMP_SQL"

echo "==> Limpiando tablas migrables en la base actual..."
psql "$CURRENT_DATABASE_URL" -f "$TRUNCATE_SQL"

echo "==> Importando datos de BD_ANTIGUA..."
psql "$CURRENT_DATABASE_URL" -f "$DUMP_SQL"

echo "==> Ajustando secuencias..."
psql "$CURRENT_DATABASE_URL" -f "$SEQUENCE_SQL"

echo "==> Verificando conteos finales..."
psql "$CURRENT_DATABASE_URL" -f "$VERIFY_SQL" | tee "$BACKUP_DIR/05_verify_counts.out"

echo
echo "Migracion completada."
echo "Respaldo y artefactos guardados en: $BACKUP_DIR"
