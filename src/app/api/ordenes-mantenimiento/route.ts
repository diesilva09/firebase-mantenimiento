import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const createOrderSchema = z.object({
  codigo_equipo: z.string(),
  tipo_mantenimiento: z.string(),
  fecha_solicitud: z.string().date(),
  responsable: z.string().optional().nullable(),
  descripcion_falla: z.string(),
  repuestos_utilizados: z.string().optional().nullable(),
  prioridad: z.string(),
  estado: z.string().default('abierta'),
  hora_inicio: z.string().optional().nullable(),
  hora_fin: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  imagen_antes_url: z.string().optional().nullable(),
  imagen_despues_url: z.string().optional().nullable(),
  anexo_url: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const { rows } = await query(
      `SELECT om.*, e.nombre AS equipo_nombre
       FROM ordenes_mantenimiento om
       LEFT JOIN equipos e ON e.codigo = om.codigo_equipo
       ORDER BY om.creado_en DESC`,
    )

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error consultando órdenes:', err)
    return NextResponse.json({ error: 'Error consultando órdenes de mantenimiento' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Limpiar espacios del código de equipo
    if (body.codigo_equipo) {
      body.codigo_equipo = body.codigo_equipo.trim();
    }
    
    console.log('Creando orden para equipo:', body.codigo_equipo);
    
    const parsedData = createOrderSchema.parse(body)

    const { rows } = await query(
      `INSERT INTO ordenes_mantenimiento (
         codigo_equipo,
         tipo_mantenimiento,
         fecha_solicitud,
         responsable,
         descripcion_falla,
         repuestos_utilizados,
         prioridad,
         estado,
         hora_inicio,
         hora_fin,
         observaciones,
         imagen_antes_url,
         imagen_despues_url,
         anexo_url
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
       )
       RETURNING *`,
      [
        parsedData.codigo_equipo,
        parsedData.tipo_mantenimiento,
        parsedData.fecha_solicitud,
        parsedData.responsable,
        parsedData.descripcion_falla,
        parsedData.repuestos_utilizados,
        parsedData.prioridad,
        parsedData.estado,
        parsedData.hora_inicio,
        parsedData.hora_fin,
        parsedData.observaciones,
        parsedData.imagen_antes_url,
        parsedData.imagen_despues_url,
        parsedData.anexo_url,
      ],
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error('Error insertando orden:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error guardando orden de mantenimiento' }, { status: 500 })
  }
}
