import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Fallback en memoria solo si no hay DATABASE_URL configurada.
const FALLBACK_EQUIPOS: any[] = [
  {
    id: 'local-1',
    codigo: 'DEMO-1',
    nombre: 'Equipo demo A',
    area: 'demo',
    linea: null,
    marca: 'MarcaA',
    modelo: 'A-100',
    fabricante: null,
    fecha_implementacion: null,
    fecha_adquisicion: null,
    capacidad: null,
    amperaje: null,
    potencia: '2kW',
    voltaje: null,
    rpm: null,
    magnitud_medida: null,
    imagen_url: null,
    creado_en: new Date().toISOString(),
  },
]

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: FALLBACK_EQUIPOS, message: 'No database configured, returning fallback data' })
  }

  try {
    const { rows } = await query(
      `SELECT id, codigo, version, nombre, area, linea, marca, modelo, fabricante,
       fecha_implementacion, fecha_adquisicion,
       capacidad, amperaje, potencia, voltaje, rpm, magnitud_medida,
       estado,
       imagen_url, attachments_url, creado_en
       FROM equipos
       ORDER BY creado_en DESC`
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error consultando equipos:', err)
    return NextResponse.json({ error: 'Error consultando equipos en la base de datos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    try {
      const body = await req.json()
      const now = new Date().toISOString()
      const newItem = {
        id: `local-${Date.now()}`,
        codigo: body.codigo,
        version: body.version || null,
        nombre: body.nombre,
        area: body.area,
        linea: body.linea || null,
        marca: body.marca || null,
        modelo: body.modelo || null,
        fabricante: body.fabricante || null,
        fecha_implementacion: body.fechaImplementacion || null,
        fecha_adquisicion: body.fechaAdquisicion || null,
        capacidad: body.capacidad || null,
        amperaje: body.amperaje || null,
        potencia: body.potencia || null,
        voltaje: body.voltaje || null,
        rpm: body.rpm || null,
        magnitud_medida: body.magnitudMedida || null,
        estado: body.estado || 'Operativo',
        imagen_url: body.imagenUrl || null,
        attachments_url: body.attachmentsUrl || null,
        creado_en: now,
      }
      FALLBACK_EQUIPOS.unshift(newItem)
      return NextResponse.json(newItem, { status: 201 })
    } catch (err) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
  }

  try {
    const body = await req.json()

    const { rows } = await query(
      `INSERT INTO equipos (
        codigo,
        version,
        nombre,
        area,
        linea,
        marca,
        modelo,
        fabricante,
        fecha_implementacion,
        fecha_adquisicion,
        capacidad,
        amperaje,
        potencia,
        voltaje,
        rpm,
        magnitud_medida,
        estado,
        imagen_url,
        attachments_url,
        creado_en
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10,
        $11, $12, $13, $14, $15, $16,
        $17,
        $18,
        $19,
        NOW()
      )
      RETURNING
        id,
        codigo,
        version,
        nombre,
        area,
        linea,
        marca,
        modelo,
        fabricante,
        fecha_implementacion,
        fecha_adquisicion,
        capacidad,
        amperaje,
        potencia,
        voltaje,
        rpm,
        magnitud_medida,
        estado,
        imagen_url,
        attachments_url,
        creado_en`,
      [
        body.codigo,
        body.version || null,
        body.nombre ?? body.codigo ?? 'Equipo sin nombre',
        body.area,
        body.linea || null,
        body.marca || null,
        body.modelo || null,
        body.fabricante || null,
        body.fechaImplementacion || null,
        body.fechaAdquisicion || null,
        body.capacidad || null,
        body.amperaje || null,
        body.potencia || null,
        body.voltaje || null,
        body.rpm || null,
        body.magnitudMedida || null,
        body.estado || 'Operativo',
        body.imagenUrl || null,
        body.attachmentsUrl || null,
      ]
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error('Error insertando equipo:', err)
    return NextResponse.json({ error: 'Error guardando equipo en la base de datos' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { rows } = await query(
      `UPDATE equipos 
       SET codigo = $1, version = $2, nombre = $3, area = $4, linea = $5, marca = $6, modelo = $7,
           fabricante = $8, fecha_implementacion = $9, fecha_adquisicion = $10,
           capacidad = $11, amperaje = $12, potencia = $13, voltaje = $14, rpm = $15,
           magnitud_medida = $16, estado = $17, imagen_url = $18, attachments_url = $19, actualizado_en = NOW()
       WHERE id = $20
       RETURNING *`,
      [
        updateData.codigo,
        updateData.version || null,
        updateData.nombre,
        updateData.area,
        updateData.linea || null,
        updateData.marca || null,
        updateData.modelo || null,
        updateData.fabricante || null,
        updateData.fecha_implementacion || null,
        updateData.fecha_adquisicion || null,
        updateData.capacidad || null,
        updateData.amperaje || null,
        updateData.potencia || null,
        updateData.voltaje || null,
        updateData.rpm || null,
        updateData.magnitud_medida || null,
        updateData.estado || 'Operativo',
        updateData.imagen_url || null,
        updateData.attachments_url || null,
        id
      ]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (err) {
    console.error('Error updating equipment:', err)
    return NextResponse.json({ error: 'Error updating equipment' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  console.log('🗑️ DELETE CASCADE request recibido')
  
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    console.log('🔍 ID recibido para eliminación CASCADE:', id)

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const numericId = parseInt(id)
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    // Verificar si existe
    const checkResult = await query('SELECT id, codigo, nombre FROM equipos WHERE id = $1', [numericId])
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    console.log('💥 Ejecutando DELETE CASCADE...')
    
    // ELIMINACIÓN FÍSICA CON CASCADE
    const result = await query(
      'DELETE FROM equipos WHERE id = $1 RETURNING id, codigo, nombre',
      [numericId]
    )
    
    console.log('✅ ELIMINACIÓN CASCADE exitosa. Equipo eliminado:', result.rows[0])
    console.log('📝 NOTA: Todas las órdenes de mantenimiento relacionadas se eliminaron automáticamente')

    return NextResponse.json({ 
      message: 'Equipment and all related maintenance orders deleted successfully',
      deleted: result.rows[0]
    })
    
  } catch (err) {
    console.error('❌ Error en DELETE CASCADE:', err)
    return NextResponse.json({ 
      error: 'Error deleting equipment',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}