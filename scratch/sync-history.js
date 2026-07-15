const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not defined in environment variables");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log("--- 1. Migrating Database Schemas ---");
    
    // Add columns to equipos_historial
    console.log("Altering table equipos_historial...");
    await pool.query(`
      ALTER TABLE equipos_historial 
      ADD COLUMN IF NOT EXISTS es_solicitada BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS solicitud_id INTEGER,
      ADD COLUMN IF NOT EXISTS origen_orden TEXT
    `);
    
    // Add columns to zonas_historial
    console.log("Altering table zonas_historial...");
    await pool.query(`
      ALTER TABLE zonas_historial 
      ADD COLUMN IF NOT EXISTS es_solicitada BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS solicitud_id INTEGER,
      ADD COLUMN IF NOT EXISTS origen_orden TEXT
    `);
    
    console.log("Database schema migrated successfully.");

    console.log("\n--- 2. Fetching Maintenance Orders ---");
    const resOrders = await pool.query(`
      SELECT * FROM ordenes_mantenimiento
      ORDER BY id ASC
    `);
    const orders = resOrders.rows;
    console.log(`Found ${orders.length} total maintenance orders.`);

    let syncedEquiposCount = 0;
    let syncedZonasCount = 0;

    for (const order of orders) {
      const tipoDestino = order.tipo_destino;
      const codigoEquipo = order.codigo_equipo ? order.codigo_equipo.trim() : null;
      const zona = order.zona ? order.zona.trim() : null;
      
      const isEquipo = tipoDestino === 'equipo' || (!tipoDestino && codigoEquipo);
      const isLocativo = tipoDestino === 'locativo' || (!tipoDestino && zona && !codigoEquipo);

      const esSolicitada = order.origen_orden === 'solicitada';
      const origenOrden = order.origen_orden || 'manual';

      if (isEquipo && codigoEquipo) {
        // Check if already in equipos_historial
        // We match by TRIM(codigo_equipo) and TRIM(labor) to identify uniqueness of the record
        const resExist = await pool.query(`
          SELECT id FROM equipos_historial
          WHERE TRIM(codigo_equipo) = $1 AND TRIM(labor) = $2
        `, [codigoEquipo, order.descripcion_falla.trim()]);

        if (resExist.rows.length === 0) {
          // Insert into equipos_historial
          await pool.query(`
            INSERT INTO equipos_historial (
              codigo_equipo,
              fecha_evento,
              labor,
              tipo_mantenimiento,
              repuestos_usados,
              observaciones,
              ejecutado_por,
              imagen_antes_url,
              imagen_despues_url,
              anexo_url,
              es_solicitada,
              solicitud_id,
              origen_orden
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            codigoEquipo,
            order.fecha_solicitud || new Date(),
            order.descripcion_falla,
            order.tipo_mantenimiento,
            order.repuestos_utilizados,
            order.observaciones,
            order.responsable,
            order.imagen_antes_url,
            order.imagen_despues_url,
            order.anexo_url,
            esSolicitada,
            order.solicitud_id || null,
            origenOrden
          ]);
          syncedEquiposCount++;
        }
      } else if (isLocativo && zona) {
        // Extract zone code
        const parts = zona.split(' - ');
        const codigoZona = parts[0]?.trim();

        if (codigoZona) {
          // Check if already in zonas_historial
          const resExist = await pool.query(`
            SELECT id FROM zonas_historial
            WHERE TRIM(codigo_zona) = $1 AND TRIM(labor) = $2
          `, [codigoZona, order.descripcion_falla.trim()]);

          if (resExist.rows.length === 0) {
            // Insert into zonas_historial
            await pool.query(`
              INSERT INTO zonas_historial (
                codigo_zona,
                fecha_evento,
                labor,
                tipo_mantenimiento,
                repuestos_usados,
                observaciones,
                ejecutado_por,
                imagen_antes_url,
                imagen_despues_url,
                anexo_url,
                es_solicitada,
                solicitud_id,
                origen_orden
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
              codigoZona,
              order.fecha_solicitud || new Date(),
              order.descripcion_falla,
              order.tipo_mantenimiento,
              order.repuestos_utilizados,
              order.observaciones,
              order.responsable,
              order.imagen_antes_url,
              order.imagen_despues_url,
              order.anexo_url,
              esSolicitada,
              order.solicitud_id || null,
              origenOrden
            ]);
            syncedZonasCount++;
          }
        }
      }
    }

    console.log(`\n--- Sincronización Completada ---`);
    console.log(`Historial Equipos: ${syncedEquiposCount} registros insertados.`);
    console.log(`Historial Zonas Locativas: ${syncedZonasCount} registros insertados.`);

  } catch (err) {
    console.error("Error running migration and sync:", err);
  } finally {
    await pool.end();
  }
}

main();
