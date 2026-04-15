import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()

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
        body.imageBefore,
        body.imageAfter,
        body.tipoMantenimiento ?? null,
        body.repuestos ?? null,
        body.observaciones ?? null,
        body.taskId,
      ]
    )

    return NextResponse.json(rows[0])
  } catch (err) {
    console.error('Error completando tarea:', err)
    return NextResponse.json({ error: 'Error completando tarea' }, { status: 500 })
  }
}