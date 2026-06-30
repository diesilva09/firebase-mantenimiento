import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const historialSchema = z.object({
  // En equipos_historial la columna codigo_equipo es NOT NULL, así que aquí también
  codigo_equipo: z.string(),
  tarea_id: z.number().optional().nullable(),
  // Permitimos null y luego ponemos un valor por defecto si falta
  fecha_evento: z.coerce.date().optional().nullable(),
  labor: z.string(),
  tipo_mantenimiento: z.string().optional().nullable(),
  repuestos_usados: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  ejecutado_por: z.string().optional().nullable(),
  creado_por: z.string().optional().nullable(),
  imagen_antes_url: z.string().optional().nullable(),
  imagen_despues_url: z.string().optional().nullable(),
  anexo_url: z.string().optional().nullable(),
  es_solicitada: z.boolean().optional().nullable(),
  solicitud_id: z.number().optional().nullable(),
  origen_orden: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Normalizar payload desde el frontend (usa camelCase)
    const normalized: any = {
      codigo_equipo: (body.codigo_equipo ?? body.codigoEquipo ?? '').trim(),
      tarea_id: body.tarea_id ?? body.tareaId ?? null,
      fecha_evento: body.fecha_evento ?? body.fechaEvento ?? null,
      labor: body.labor,
      tipo_mantenimiento: body.tipo_mantenimiento ?? body.tipoMantenimiento ?? null,
      repuestos_usados: body.repuestos_usados ?? body.repuestosUsados ?? null,
      observaciones: body.observaciones ?? body.observaciones ?? null,
      ejecutado_por: body.ejecutado_por ?? body.ejecutadoPor ?? null,
      creado_por: body.creado_por ?? body.creadoPor ?? null,
      imagen_antes_url: body.imagen_antes_url ?? body.imagenAntesUrl ?? null,
      imagen_despues_url: body.imagen_despues_url ?? body.imagenDespuesUrl ?? null,
      anexo_url: body.anexo_url ?? body.anexoUrl ?? null,
      es_solicitada: body.es_solicitada ?? body.esSolicitada ?? false,
      solicitud_id: body.solicitud_id ?? body.solicitudId ?? null,
      origen_orden: body.origen_orden ?? body.origenOrden ?? "manual",
    }

    // codigo_equipo es obligatorio: si no viene, devolvemos 400 en vez de insertar NULL
    if (!normalized.codigo_equipo) {
      return NextResponse.json(
        { error: 'codigo_equipo es obligatorio para equipos_historial' },
        { status: 400 },
      )
    }

    if (!normalized.fecha_evento) {
      // Usar fecha actual si no se envía explícitamente
      normalized.fecha_evento = new Date().toISOString()
    }

    const data = historialSchema.parse(normalized)
    
    console.log('Guardando en equipos_historial - codigo_equipo:', data.codigo_equipo);
    
    const { rows } = await query(
      `INSERT INTO equipos_historial (
         codigo_equipo,
         tarea_id,
         fecha_evento,
         labor,
         tipo_mantenimiento,
         repuestos_usados,
         observaciones,
         ejecutado_por,
         creado_por,
         imagen_antes_url,
         imagen_despues_url,
         anexo_url,
         es_solicitada,
         solicitud_id,
         origen_orden
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
       )
       RETURNING *`,
      [
        data.codigo_equipo,
        data.tarea_id ?? null,
        data.fecha_evento ?? new Date(),
        data.labor,
        data.tipo_mantenimiento ?? null,
        data.repuestos_usados ?? null,
        data.observaciones ?? null,
        data.ejecutado_por ?? null,
        data.creado_por ?? null,
        data.imagen_antes_url ?? null,
        data.imagen_despues_url ?? null,
        data.anexo_url ?? null,
        data.es_solicitada ?? false,
        data.solicitud_id ?? null,
        data.origen_orden ?? "manual",
      ],
    )
    return NextResponse.json({ data: rows[0] })
  } catch (err) {
    console.error('Error creando registro en equipos_historial:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error creando registro en equipos_historial' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const codigoEquipo = searchParams.get('codigoEquipo')

    if (!codigoEquipo) {
      return NextResponse.json({ data: [], message: 'codigoEquipo requerido' }, { status: 400 })
    }

    // Buscar con y sin espacios para mayor robustez
    const codigoTrimmed = codigoEquipo.trim();
    console.log('Buscando historial para equipo:', codigoEquipo, '| Trimmed:', codigoTrimmed);

    const { rows } = await query(
      `SELECT * FROM equipos_historial
       WHERE TRIM(codigo_equipo) = $1
       ORDER BY fecha_evento DESC, id DESC`,
      [codigoTrimmed],
    )

    console.log('Registros encontrados:', rows.length, 'para código:', codigoTrimmed);

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error consultando equipos_historial:', err)
    return NextResponse.json({ error: 'Error consultando equipos_historial' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const { rows } = await query(
      'DELETE FROM equipos_historial WHERE id = $1 RETURNING *',
      [id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: rows[0], message: 'Registro eliminado' })
  } catch (err) {
    console.error('Error eliminando registro de equipos_historial:', err)
    return NextResponse.json({ error: 'Error eliminando registro' }, { status: 500 })
  }
}
