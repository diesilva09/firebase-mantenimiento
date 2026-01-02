import { NextResponse } from 'next/server'
import { query } from "@/lib/db";
import { z } from 'zod'

const equipoSchema = z.object({
  codigo: z.string(),
  version: z.string().optional().nullable(),
  nombre: z.string(),
  area: z.string().optional().nullable(),
  linea: z.string().optional().nullable(),
  marca: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  fabricante: z.string().optional().nullable(),
  fecha_implementacion: z.coerce.date().optional().nullable(),
  fecha_adquisicion: z.coerce.date().optional().nullable(),
  capacidad: z.string().optional().nullable(),
  amperaje: z.string().optional().nullable(),
  potencia: z.string().optional().nullable(),
  voltaje: z.string().optional().nullable(),
  rpm: z.string().optional().nullable(),
  magnitud_medida: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  imagen_url: z.string().optional().nullable(),
  attachments_url: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const { rows } = await query('SELECT * FROM equipos ORDER BY creado_en DESC')
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error consultando equipos:', err)
    return NextResponse.json({ error: 'Error consultando equipos en la base de datos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = equipoSchema.parse(body)
    const { rows } = await query(
      `INSERT INTO equipos (
        codigo, version, nombre, area, linea, marca, modelo, fabricante,
        fecha_implementacion, fecha_adquisicion, capacidad, amperaje,
        potencia, voltaje, rpm, magnitud_medida, estado, imagen_url,
        attachments_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *`,
      [
        data.codigo,
        data.version,
        data.nombre,
        data.area,
        data.linea,
        data.marca,
        data.modelo,
        data.fabricante,
        data.fecha_implementacion ?? null,
        data.fecha_adquisicion ?? null,
        data.capacidad,
        data.amperaje,
        data.potencia,
        data.voltaje,
        data.rpm,
        data.magnitud_medida,
        data.estado,
        data.imagen_url,
        data.attachments_url,
      ],
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error('Error insertando equipo:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error guardando equipo en la base de datos' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updateData } = body
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    const normalizedUpdate: any = { ...updateData }
    if (normalizedUpdate.fecha_implementacion === '' || normalizedUpdate.fecha_implementacion === undefined) {
      normalizedUpdate.fecha_implementacion = null
    }
    if (normalizedUpdate.fecha_adquisicion === '' || normalizedUpdate.fecha_adquisicion === undefined) {
      normalizedUpdate.fecha_adquisicion = null
    }

    const data = equipoSchema.partial().parse(normalizedUpdate)
    const { rows } = await query(
      `UPDATE equipos SET
        codigo = $1,
        version = $2,
        nombre = $3,
        area = $4,
        linea = $5,
        marca = $6,
        modelo = $7,
        fabricante = $8,
        fecha_implementacion = $9,
        fecha_adquisicion = $10,
        capacidad = $11,
        amperaje = $12,
        potencia = $13,
        voltaje = $14,
        rpm = $15,
        magnitud_medida = $16,
        estado = $17,
        imagen_url = $18,
        attachments_url = $19
      WHERE id = $20
      RETURNING *`,
      [
        data.codigo,
        data.version,
        data.nombre,
        data.area,
        data.linea,
        data.marca,
        data.modelo,
        data.fabricante,
        data.fecha_implementacion,
        data.fecha_adquisicion,
        data.capacidad,
        data.amperaje,
        data.potencia,
        data.voltaje,
        data.rpm,
        data.magnitud_medida,
        data.estado,
        data.imagen_url,
        data.attachments_url,
        Number(id),
      ],
    )
    return NextResponse.json(rows[0])
  } catch (err) {
    console.error('Error updating equipment:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error updating equipment' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    const numericId = parseInt(id)
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }
    const { rows } = await query('DELETE FROM equipos WHERE id = $1 RETURNING *', [numericId])
    return NextResponse.json({
      message: 'Equipment and all related maintenance orders deleted successfully',
      deleted: rows[0],
    })
  } catch (err) {
    console.error('❌ Error en DELETE CASCADE:', err)
    return NextResponse.json({
      error: 'Error deleting equipment',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
