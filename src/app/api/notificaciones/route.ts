import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createNotification } from '@/lib/notification-service'

export async function GET() {
  try {
    // Solo mostrar notificaciones de los últimos 7 días para evitar mostrar notificaciones antiguas o de otros usuarios
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await query(
      'SELECT id, titulo, mensaje, tipo, severidad, estado_tarea, prioridad, ref_task_id, creado_en FROM notificaciones WHERE creado_en >= $1 ORDER BY creado_en DESC LIMIT 50',
      [sevenDaysAgo.toISOString()]
    )
    return NextResponse.json({ data: result.rows })
  } catch (e) {
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const newNotification = await createNotification(body);
    return NextResponse.json({ data: newNotification })
  } catch (e) {
    console.error('Error en la ruta POST /api/notificaciones:', e)
    return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 })
  }
}
