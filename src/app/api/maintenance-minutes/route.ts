import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      tecnico, 
      trabajoRealizado, 
      quedaPendiente, 
      descripcionPendiente, 
      repuestos, 
      fechaEjecucion, 
      horaInicio, 
      horaFin, 
      tiempoTotal 
    } = body

    console.log('Datos recibidos para minuta:', body)

    // Convertir fecha a formato Date si es string
    const fechaEjecucionDate = typeof fechaEjecucion === 'string' 
      ? new Date(fechaEjecucion) 
      : fechaEjecucion

    // Insertar en la base de datos
    const result = await query(
      `INSERT INTO maintenance_minutes (
        tecnico, trabajo_realizado, queda_pendiente, descripcion_pendiente, 
        repuestos_utilizados, fecha_ejecucion, hora_inicio, hora_fin, tiempo_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        tecnico, 
        trabajoRealizado, 
        quedaPendiente === "si", 
        descripcionPendiente || null,
        repuestos, 
        fechaEjecucionDate, 
        horaInicio || null, 
        horaFin || null, 
        tiempoTotal
      ]
    )

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating maintenance minute:', error)
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
      `SELECT * FROM maintenance_minutes 
       ORDER BY created_at DESC 
       LIMIT 100`
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error fetching maintenance minutes:', err)
    return NextResponse.json({ error: 'Error consultando minutos de mantenimiento' }, { status: 500 })
  }
}