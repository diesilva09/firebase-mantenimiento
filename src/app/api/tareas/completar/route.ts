import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()

    // Las URLs ahora vienen como strings separados por comas desde el MultiFileUploader
    const imageBeforeUrl = body.imageBeforeUrl || null
    const imageAfterUrl = body.imageAfterUrl || null
    const anexoUrl = body.anexoUrl || null

    const { rows } = await query(
      `UPDATE tareas_cronograma 
       SET estado = 'completada',
           trabajo_realizado = $1,
           ejecutado_por = $2,
           fecha_completada = $3,
           imagen_antes = $4,
           imagen_despues = $5,
           anexo_url = $6,
           tipo_mantenimiento = $7,
           repuestos_usados = $8,
           observaciones = $9
       WHERE id = $10
       RETURNING *`,
      [
        body.workDone,
        body.executedBy,
        body.completionDate,
        imageBeforeUrl,
        imageAfterUrl,
        anexoUrl,
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
            anexoUrl,
          ]
        )
      } catch (historialError) {
        // No fallamos la operación principal si el historial falla
        console.error('Error guardando en historial:', historialError)
      }
    }

    // Guardar en el historial de zonas si aplica
    if (tareaCompletada && tareaCompletada.codigo_zona) {
      try {
        await query(
          `INSERT INTO zonas_historial (
             codigo_zona,
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
            tareaCompletada.codigo_zona,
            tareaCompletada.id,
            body.completionDate || new Date().toISOString(),
            body.workDone,
            body.tipoMantenimiento ?? null,
            body.repuestos ?? null,
            body.observaciones ?? null,
            body.executedBy,
            imageBeforeUrl,
            imageAfterUrl,
            anexoUrl,
          ]
        )
      } catch (historialError) {
        console.error('Error guardando en historial de zonas:', historialError)
      }
    }

    return NextResponse.json(tareaCompletada)
  } catch (err) {
    console.error('Error completando tarea:', err)
    return NextResponse.json({ error: 'Error completando tarea' }, { status: 500 })
  }
}