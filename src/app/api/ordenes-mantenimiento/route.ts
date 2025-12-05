import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [], message: 'No database configured' })
  }

  try {
    const { rows } = await query(
      `SELECT om.*, e.nombre as equipo_nombre
       FROM ordenes_mantenimiento om
       LEFT JOIN equipos e ON om.codigo_equipo = e.codigo
       ORDER BY om.creado_en DESC`
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error consultando órdenes:', err)
    return NextResponse.json({ error: 'Error consultando órdenes de mantenimiento' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const { rows } = await query(
      `INSERT INTO ordenes_mantenimiento (
        codigo_equipo, tipo_mantenimiento, fecha_solicitud, responsable,
        descripcion_falla, repuestos_utilizados, prioridad, estado,
        hora_inicio, hora_fin, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        body.codigo_equipo,
        body.tipo_mantenimiento,
        body.fecha_solicitud || new Date().toISOString().split('T')[0],
        body.responsable,
        body.descripcion_falla,
        body.repuestos_utilizados,
        body.prioridad,
        body.estado || 'abierta',
        body.hora_inicio,
        body.hora_fin,
        body.observaciones
      ]
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error('Error insertando orden:', err)
    return NextResponse.json({ error: 'Error guardando orden de mantenimiento' }, { status: 500 })
  }
}