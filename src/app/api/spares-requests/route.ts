import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { repuesto, cantidad, maquina, locativo, tecnico, fechaSolicitud } = body

    console.log('Datos recibidos:', body)

    // Insertar en la base de datos
    const result = await query(
      `INSERT INTO spares_requests (repuesto, cantidad, maquina, locativo, tecnico, fecha_solicitud) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [repuesto, cantidad, maquina, locativo, tecnico, fechaSolicitud]
    )

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating spare request:', error)
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
      `UPDATE spares_requests SET
         repuesto = $1,
         cantidad = $2,
         maquina = $3,
         locativo = $4,
         tecnico = $5,
         fecha_solicitud = $6,
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [body.repuesto, body.cantidad, body.maquina, body.locativo, body.tecnico, body.fechaSolicitud, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Solicitud no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    console.error('Error updating spare request:', error)
    return NextResponse.json({ success: false, error: 'Error actualizando solicitud' }, { status: 500 })
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
      'DELETE FROM spares_requests WHERE id = $1 RETURNING *',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Solicitud no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Solicitud eliminada' })
  } catch (error: any) {
    console.error('Error deleting spare request:', error)
    return NextResponse.json({ success: false, error: 'Error eliminando solicitud' }, { status: 500 })
  }
}

// AGREGAR ESTA FUNCIÓN GET:
export async function GET() {
  try {
    const { rows } = await query(
      `SELECT * FROM spares_requests 
       ORDER BY created_at DESC 
       LIMIT 100`
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error fetching spare requests:', err)
    return NextResponse.json({ error: 'Error consultando solicitudes de repuestos' }, { status: 500 })
  }
}