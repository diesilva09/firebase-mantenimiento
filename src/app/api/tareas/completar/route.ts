import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import {
  uploadBase64Image,
  getOrCreateImagenesFolder,
  extractFolderIdFromUrl,
  createSubfolder,
} from '@/lib/google-drive'

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()

    let imageBeforeUrl: string | null = null
    let imageAfterUrl: string | null = null

    // Si modo manual está activo, usar las URLs que vienen del frontend directamente
    if (body.modoManual) {
      imageBeforeUrl = body.imageBefore || null
      imageAfterUrl = body.imageAfter || null
    } else if (body.imageBefore || body.imageAfter) {
      // Modo automático: subir imágenes a Google Drive
      // Obtener información del equipo asociado a la tarea
      const { rows: tareaRows } = await query(
        'SELECT codigo_equipo FROM tareas_cronograma WHERE id = $1',
        [body.taskId]
      )

      if (tareaRows.length > 0 && tareaRows[0].codigo_equipo) {
        const codigoEquipo = tareaRows[0].codigo_equipo

        // Buscar imagenes_folder_id primero, si no existe usar attachments_url
        const { rows: equipoRows } = await query(
          'SELECT id, attachments_url, imagenes_folder_id, nombre FROM equipos WHERE codigo = $1',
          [codigoEquipo]
        )

        if (equipoRows.length > 0) {
          const equipo = equipoRows[0]
          let imagenesFolderId: string | null = equipo.imagenes_folder_id

          // Si no tiene imagenes_folder_id, crear desde attachments_url
          if (!imagenesFolderId && equipo.attachments_url) {
            const parentFolderId = extractFolderIdFromUrl(equipo.attachments_url)
            if (parentFolderId) {
              try {
                const subfolder = await createSubfolder(parentFolderId, 'imagenes-mantenimiento')
                imagenesFolderId = subfolder.id
                // Guardar en BD para futuros usos
                await query(
                  'UPDATE equipos SET imagenes_folder_id = $1 WHERE id = $2',
                  [imagenesFolderId, equipo.id]
                )
              } catch (error) {
                console.error('Error creando subcarpeta de imágenes:', error)
              }
            }
          }

          // Si tenemos carpeta de imágenes, subir las imágenes
          if (imagenesFolderId) {
            const fecha = new Date().toISOString().split('T')[0]
            const taskCode = body.taskCode || body.taskId

            try {
              if (body.imageBefore) {
                imageBeforeUrl = await uploadBase64Image(
                  imagenesFolderId,
                  `tarea-${taskCode}-${fecha}-antes.jpg`,
                  body.imageBefore
                )
              }

              if (body.imageAfter) {
                imageAfterUrl = await uploadBase64Image(
                  imagenesFolderId,
                  `tarea-${taskCode}-${fecha}-despues.jpg`,
                  body.imageAfter
                )
              }
            } catch (uploadError) {
              console.error('Error subiendo imágenes a Drive:', uploadError)
              // Continuamos sin las imágenes de Drive, no fallamos la tarea completa
            }
          }
        }
      }
    }

    const { rows } = await query(
      `UPDATE tareas_cronograma 
       SET estado = 'completada',
           trabajo_realizado = $1,
           ejecutado_por = $2,
           fecha_completada = $3,
           imagen_antes = $4,
           imagen_despues = $5,
           tipo_mantenimiento = $6,
           repuestos_usados = $7,
           observaciones = $8
       WHERE id = $9
       RETURNING *`,
      [
        body.workDone,
        body.executedBy,
        body.completionDate,
        imageBeforeUrl,
        imageAfterUrl,
        body.tipoMantenimiento ?? null,
        body.repuestos ?? null,
        body.observaciones ?? null,
        body.taskId,
      ]
    )

    const tareaCompletada = rows[0]

    // Guardar en el historial de equipos (hoja de vida)
    if (tareaCompletada && tareaCompletada.codigo_equipo) {
      try {
        await query(
          `INSERT INTO equipos_historial (
             codigo_equipo,
             tarea_id,
             fecha_evento,
             labor,
             tipo_mantenimiento,
             repuestos_usados,
             observaciones,
             ejecutado_por,
             imagen_antes_url,
             imagen_despues_url,
             anexo_url
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            tareaCompletada.codigo_equipo,
            tareaCompletada.id,
            body.completionDate || new Date().toISOString(),
            body.workDone,
            body.tipoMantenimiento ?? null,
            body.repuestos ?? null,
            body.observaciones ?? null,
            body.executedBy,
            imageBeforeUrl,
            imageAfterUrl,
            body.anexoUrl ?? null,
          ]
        )
      } catch (historialError) {
        // No fallamos la operación principal si el historial falla
        console.error('Error guardando en historial:', historialError)
      }
    }

    return NextResponse.json(tareaCompletada)
  } catch (err) {
    console.error('Error completando tarea:', err)
    return NextResponse.json({ error: 'Error completando tarea' }, { status: 500 })
  }
}