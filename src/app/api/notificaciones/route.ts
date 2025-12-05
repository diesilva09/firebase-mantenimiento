// /api/notificaciones/route.ts
import { NextResponse } from 'next/server'
import { query } from '@/lib/db' // usamos query, no db

export async function GET() {
  try {
    const result = await query(
      'SELECT id, titulo, mensaje, tipo, severidad, estado_tarea, prioridad, ref_task_id, creado_en FROM notificaciones ORDER BY creado_en DESC LIMIT 50'
    )
    return NextResponse.json({ data: result.rows })
  } catch (e) {
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      titulo,
      mensaje,
      tipo,
      severidad,
      estado_tarea,
      prioridad,
      ref_task_id,
    } = body

    const result = await query(
      `INSERT INTO notificaciones
        (titulo, mensaje, tipo, severidad, estado_tarea, prioridad, ref_task_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, titulo, mensaje, tipo, severidad, estado_tarea, prioridad, ref_task_id, creado_en`,
      [titulo, mensaje, tipo, severidad, estado_tarea, prioridad, ref_task_id]
    )

    return NextResponse.json({ data: result.rows[0] })
  } catch (e) {
    console.error('Error al crear notificación', e)
    return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 })
  }
}
