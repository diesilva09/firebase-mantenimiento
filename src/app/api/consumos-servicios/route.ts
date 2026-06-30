import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [], message: 'No database configured' })
  }

  try {
    const { rows } = await query(
      `SELECT * FROM consumos_servicios 
       ORDER BY fecha DESC, creado_en DESC`
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error consultando consumos:', err)
    return NextResponse.json({ error: 'Error consultando consumos de servicios' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const { rows } = await query(
      `INSERT INTO consumos_servicios (
        fecha, energia_kwh, gas_principal_m3, agua_principal_m3,
        agua_caldera_manana_m3, agua_caldera_tarde_m3,
        agua_salsas_manana_m3, agua_salsas_tarde_m3,
        agua_frutos_manana_m3, agua_frutos_tarde_m3,
        agua_autoclave_manana_m3, agua_autoclave_tarde_m3,
        observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        body.fecha,
        body.energia_kwh,
        body.gas_principal_m3,
        body.agua_principal_m3,
        body.agua_caldera_manana_m3,
        body.agua_caldera_tarde_m3,
        body.agua_salsas_manana_m3,
        body.agua_salsas_tarde_m3,
        body.agua_frutos_manana_m3,
        body.agua_frutos_tarde_m3,
        body.agua_autoclave_manana_m3,
        body.agua_autoclave_tarde_m3,
        body.observaciones || 'Registro diario de servicios'
      ]
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error('Error insertando consumo:', err)
    return NextResponse.json({ error: 'Error guardando consumo de servicio' }, { status: 500 })
  }
}