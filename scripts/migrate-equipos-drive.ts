/**
 * Script de migración para crear carpetas de imágenes en Google Drive
 * para todos los equipos existentes que tengan attachments_url.
 *
 * Ejecutar: npx tsx scripts/migrate-equipos-drive.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Debug: mostrar si las variables están cargadas
console.log('🔧 Debug - CLIENT_EMAIL exists:', !!process.env.GOOGLE_DRIVE_CLIENT_EMAIL);
console.log('🔧 Debug - PRIVATE_KEY exists:', !!process.env.GOOGLE_DRIVE_PRIVATE_KEY);

import { query } from '../src/lib/db';
import { extractFolderIdFromUrl, createSubfolder } from '../src/lib/google-drive';

async function migrateEquipos() {
  console.log('🚀 Iniciando migración de equipos a Google Drive...\n');

  try {
    // Verificar variables de entorno
    if (!process.env.GOOGLE_DRIVE_CLIENT_EMAIL || !process.env.GOOGLE_DRIVE_PRIVATE_KEY) {
      console.error('❌ Error: Variables de entorno de Google Drive no configuradas');
      console.log('   Asegúrate de tener GOOGLE_DRIVE_CLIENT_EMAIL y GOOGLE_DRIVE_PRIVATE_KEY en .env.local');
      process.exit(1);
    }

    // Obtener todos los equipos que tienen attachments_url pero no imagenes_folder_id
    const { rows: equipos } = await query(
      `SELECT id, codigo, nombre, attachments_url, imagenes_folder_id 
       FROM equipos 
       WHERE attachments_url IS NOT NULL 
         AND attachments_url != ''
         AND (imagenes_folder_id IS NULL OR imagenes_folder_id = '')
       ORDER BY id`
    );

    console.log(`📊 Encontrados ${equipos.length} equipos para migrar\n`);

    if (equipos.length === 0) {
      console.log('✅ No hay equipos pendientes de migración');
      return;
    }

    let exitosos = 0;
    let fallidos = 0;

    for (const equipo of equipos) {
      try {
        console.log(`⏳ Procesando equipo ${equipo.codigo} - ${equipo.nombre}...`);

        const parentFolderId = extractFolderIdFromUrl(equipo.attachments_url);

        if (!parentFolderId) {
          console.warn(`   ⚠️  No se pudo extraer folderId de: ${equipo.attachments_url}`);
          fallidos++;
          continue;
        }

        // Crear subcarpeta de imágenes
        const subfolder = await createSubfolder(parentFolderId, 'imagenes-mantenimiento');

        // Guardar en la base de datos
        await query(
          'UPDATE equipos SET imagenes_folder_id = $1 WHERE id = $2',
          [subfolder.id, equipo.id]
        );

        console.log(`   ✅ Carpeta creada: ${subfolder.url}`);
        exitosos++;

        // Pequeña pausa para no saturar la API de Google
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Error migrando equipo ${equipo.codigo}:`, error);
        fallidos++;
      }
    }

    console.log('\n📊 Resumen de migración:');
    console.log(`   ✅ Exitosos: ${exitosos}`);
    console.log(`   ❌ Fallidos: ${fallidos}`);
    console.log(`   📁 Total: ${equipos.length}`);

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Cargar variables de entorno
require('dotenv').config();

migrateEquipos();
