import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { equipo, responsable, tipoInspeccion, estado, observaciones, fechaInspeccion } = body

    console.log('Datos recibidos para inspección:', body)

    // Insertar en la base de datos
    const result = await query(
      `INSERT INTO equipment_inspections (equipo, responsable, tipo_inspeccion, estado, observaciones, fecha_inspeccion) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [equipo, responsable, tipoInspeccion, estado, observaciones, fechaInspeccion]
    )

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating equipment inspection:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 })
    }

    const body = await request.json()
    
    const result = await query(
      `UPDATE equipment_inspections SET
         equipo = $1,
         responsable = $2,
         tipo_inspeccion = $3,
         estado = $4,
         observaciones = $5,
         fecha_inspeccion = $6,
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [body.equipo, body.responsable, body.tipoInspeccion, body.estado, body.observaciones, body.fechaInspeccion, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Inspección no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    console.error('Error updating equipment inspection:', error)
    return NextResponse.json({ success: false, error: 'Error actualizando inspección' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 })
    }

    const result = await query(
      'DELETE FROM equipment_inspections WHERE id = $1 RETURNING *',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Inspección no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Inspección eliminada' })
  } catch (error: any) {
    console.error('Error deleting equipment inspection:', error)
    return NextResponse.json({ success: false, error: 'Error eliminando inspección' }, { status: 500 })
  }
}

// AGREGAR ESTA FUNCIÓN GET:
export async function GET() {
  try {
    const { rows } = await query(
      `SELECT * FROM equipment_inspections 
       ORDER BY created_at DESC 
       LIMIT 100`
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error fetching equipment inspections:', err)
    return NextResponse.json({ error: 'Error consultando inspecciones' }, { status: 500 })
  }
}