import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [], message: 'No database configured' })
  }

  try {
    const { rows } = await query(
      `SELECT po.*, e.nombre as equipo_nombre
       FROM paradas_operativas po
       LEFT JOIN equipos e ON po.codigo_equipo = e.codigo
       ORDER BY po.creado_en DESC`
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error consultando paradas:', err)
    return NextResponse.json({ error: 'Error consultando paradas operativas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const { rows } = await query(
      `INSERT INTO paradas_operativas (
        codigo_equipo, referencia, fecha_parada, hora_parada,
        duracion_min, tipo_parada, motivo, impacto_produccion, observaciones, tecnico_encargado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        body.codigo_equipo,
        body.referencia,
        body.fecha_parada,
        body.hora_parada,
        body.duracion_min,
        body.tipo_parada,
        body.motivo,
        body.impacto_produccion,
        body.observaciones,
        body.tecnico_encargado,
      ]
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error('Error insertando parada:', err)
    return NextResponse.json({ error: 'Error guardando parada operativa' }, { status: 500 })
  }
}