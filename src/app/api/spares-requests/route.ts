import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { repuesto, cantidad, maquina, locativo, tecnico } = body

    console.log('Datos recibidos:', body)

    // Insertar en la base de datos
    const result = await query(
      `INSERT INTO spares_requests (repuesto, cantidad, maquina, locativo, tecnico) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [repuesto, cantidad, maquina, locativo, tecnico]
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