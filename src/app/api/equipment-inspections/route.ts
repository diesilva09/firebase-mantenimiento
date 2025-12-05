import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { equipo, responsable, tipoInspeccion, estado, observaciones } = body

    console.log('Datos recibidos para inspección:', body)

    // Insertar en la base de datos
    const result = await query(
      `INSERT INTO equipment_inspections (equipo, responsable, tipo_inspeccion, estado, observaciones) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [equipo, responsable, tipoInspeccion, estado, observaciones]
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