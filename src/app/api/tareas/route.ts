import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [], message: 'No database configured' })
  }

  try {
    const { rows } = await query(
      `SELECT tc.*, e.nombre as equipo_nombre
       FROM tareas_cronograma tc
       LEFT JOIN equipos e ON tc.codigo_equipo = e.codigo
       ORDER BY tc.fecha_programada DESC`
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error consultando tareas:', err)
    return NextResponse.json({ error: 'Error consultando tareas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const { rows } = await query(
      `INSERT INTO tareas_cronograma (
        codigo_equipo, codigo_zona, area, titulo, descripcion, tipo_tarea,
        cronograma, prioridad, estado, fecha_programada, responsable, tiene_alerta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        body.codigo_equipo,
        body.codigo_zona,
        body.area,
        body.titulo,
        body.descripcion,
        body.tipo_tarea || 'mantenimiento',
        body.cronograma,
        body.prioridad,
        'pendiente',
        body.fecha_programada,
        body.responsable,
        body.tiene_alerta || false
      ]
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error('Error insertando tarea:', err)
    return NextResponse.json({ error: 'Error guardando tarea' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const { rows } = await query(
      `UPDATE tareas_cronograma 
       SET codigo_equipo = $1,
           codigo_zona = $2,
           area = $3,
           titulo = $4,
           descripcion = $5,
           tipo_tarea = $6,
           cronograma = $7,
           prioridad = $8,
           fecha_programada = $9,
           responsable = $10,
           tiene_alerta = $11
       WHERE id = $12
       RETURNING *`,
      [
        body.codigo_equipo,
        body.codigo_zona,
        body.area,
        body.titulo,
        body.descripcion,
        body.tipo_tarea || 'mantenimiento',
        body.cronograma,
        body.prioridad,
        body.fecha_programada,
        body.responsable,
        body.tiene_alerta || false,
        body.id
      ]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (err) {
    console.error('Error actualizando tarea:', err)
    return NextResponse.json({ error: 'Error actualizando tarea' }, { status: 500 })
  }
}

// DELETE - Eliminar tarea
export async function DELETE(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de tarea requerido' }, { status: 400 })
    }

    const { rows } = await query(
      'DELETE FROM tareas_cronograma WHERE id = $1 RETURNING *',
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Tarea eliminada' })
  } catch (err) {
    console.error('Error eliminando tarea:', err)
    return NextResponse.json({ error: 'Error eliminando tarea' }, { status: 500 })
  }
}
