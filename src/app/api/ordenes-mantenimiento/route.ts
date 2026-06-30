import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

function normalizeDateInput(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const yyyyMmDdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (yyyyMmDdMatch) {
    return trimmed
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createOrderSchema = z.object({
  codigo_equipo: z.string().optional().nullable(),
  zona: z.string().optional().nullable(),
  referencia_otro: z.string().optional().nullable(),
  tipo_mantenimiento: z.string(),
  fecha_solicitud: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD.'),
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
  origen_orden: z.enum(["manual", "solicitada"]).optional().default("manual"),
  solicitud_id: z.number().optional().nullable(),
  tipo_destino: z.enum(["equipo", "locativo", "otro"]).optional().default("equipo"),
})

const OTRO_PREFIX = "__OTRO__:"

async function ensureOrdenesSchema() {
  try {
    await query(`ALTER TABLE ordenes_mantenimiento ADD COLUMN IF NOT EXISTS referencia_otro TEXT`)
    await query(`ALTER TABLE ordenes_mantenimiento ADD COLUMN IF NOT EXISTS origen_orden TEXT`)
    await query(`ALTER TABLE ordenes_mantenimiento ADD COLUMN IF NOT EXISTS solicitud_id INTEGER`)
    await query(`ALTER TABLE ordenes_mantenimiento ADD COLUMN IF NOT EXISTS tipo_destino TEXT`)
    await query(
      `UPDATE ordenes_mantenimiento
       SET origen_orden = COALESCE(origen_orden, CASE WHEN solicitud_id IS NOT NULL THEN 'solicitada' ELSE 'manual' END),
           tipo_destino = COALESCE(
             tipo_destino,
             CASE
               WHEN referencia_otro IS NOT NULL THEN 'otro'
               WHEN zona LIKE '${OTRO_PREFIX}%'
                 THEN 'otro'
               WHEN codigo_equipo IS NOT NULL THEN 'equipo'
               WHEN zona IS NOT NULL THEN 'locativo'
               ELSE 'equipo'
             END
           ),
           referencia_otro = COALESCE(
             referencia_otro,
             CASE
               WHEN zona LIKE '${OTRO_PREFIX}%'
                 THEN SUBSTRING(zona FROM ${OTRO_PREFIX.length + 1})
               ELSE referencia_otro
             END
           ),
           zona = CASE
             WHEN zona LIKE '${OTRO_PREFIX}%'
               THEN NULL
             ELSE zona
           END`
    )
  } catch (error) {
    console.warn("No se pudo autoajustar el esquema de ordenes_mantenimiento:", error)
  }
}

async function getOrdenesSchemaInfo() {
  const { rows } = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'ordenes_mantenimiento'`
  )

  const columns = new Set(rows.map((row: any) => String(row.column_name)))

  return {
    hasZona: columns.has('zona'),
    hasReferenciaOtro: columns.has('referencia_otro'),
    hasOrigenOrden: columns.has('origen_orden'),
    hasSolicitudId: columns.has('solicitud_id'),
    hasTipoDestino: columns.has('tipo_destino'),
  }
}

function normalizeOrdenRow(row: any, schemaInfo: Awaited<ReturnType<typeof getOrdenesSchemaInfo>>) {
  const fallbackReferenciaOtro =
    typeof row.zona === 'string' && row.zona.startsWith(OTRO_PREFIX)
      ? row.zona.slice(OTRO_PREFIX.length)
      : null

  const referenciaOtro = schemaInfo.hasReferenciaOtro
    ? row.referencia_otro ?? fallbackReferenciaOtro
    : fallbackReferenciaOtro

  const tipoDestino =
    schemaInfo.hasTipoDestino && row.tipo_destino
      ? row.tipo_destino
      : referenciaOtro
        ? 'otro'
        : row.codigo_equipo
          ? 'equipo'
          : row.zona
            ? 'locativo'
            : 'equipo'

  const origenOrden =
    schemaInfo.hasOrigenOrden && row.origen_orden
      ? row.origen_orden
      : (schemaInfo.hasSolicitudId ? row.solicitud_id ?? null : null)
        ? 'solicitada'
        : 'manual'

  return {
    ...row,
    zona: tipoDestino === 'otro' ? null : (schemaInfo.hasZona ? row.zona ?? null : null),
    referencia_otro: referenciaOtro,
    origen_orden: origenOrden,
    solicitud_id: schemaInfo.hasSolicitudId ? row.solicitud_id ?? null : null,
    tipo_destino: tipoDestino,
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureOrdenesSchema()
    const schemaInfo = await getOrdenesSchemaInfo()
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')
    const id = idParam ? Number(idParam) : null

    if (idParam && (!id || Number.isNaN(id))) {
      return NextResponse.json({ error: 'El id enviado no es valido.' }, { status: 400 })
    }

    const { rows } = await query(
      `SELECT om.*, e.nombre AS equipo_nombre
       FROM ordenes_mantenimiento om
       LEFT JOIN equipos e ON e.codigo = om.codigo_equipo
       ${id ? 'WHERE om.id = $1' : ''}
       ORDER BY om.creado_en DESC`,
      id ? [id] : []
    )

    return NextResponse.json({ data: rows.map((row: any) => normalizeOrdenRow(row, schemaInfo)) })
  } catch (err) {
    console.error('Error consultando órdenes:', err)
    return NextResponse.json({ error: 'Error consultando órdenes de mantenimiento' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await ensureOrdenesSchema()
    const body = await req.json()
    const schemaInfo = await getOrdenesSchemaInfo()
    
    // Limpiar espacios del código de equipo
    if (body.codigo_equipo) {
      body.codigo_equipo = body.codigo_equipo.trim();
    }

    body.fecha_solicitud = normalizeDateInput(body.fecha_solicitud)
    
    console.log('Creando orden de mantenimiento:', {
      tipoDestino: body.tipo_destino ?? 'equipo',
      codigoEquipo: body.codigo_equipo ?? null,
      zona: body.zona ?? null,
      referenciaOtro: body.referencia_otro ?? null,
    });
    
    const parsedData = createOrderSchema.parse(body)

    if (schemaInfo.hasSolicitudId && parsedData.solicitud_id !== null && parsedData.solicitud_id !== undefined) {
      const existingOrder = await query(
        `SELECT om.*, e.nombre AS equipo_nombre
         FROM ordenes_mantenimiento om
         LEFT JOIN equipos e ON e.codigo = om.codigo_equipo
         WHERE om.solicitud_id = $1
         ORDER BY om.id DESC
         LIMIT 1`,
        [parsedData.solicitud_id]
      )

      if (existingOrder.rows.length > 0) {
        return NextResponse.json(
          {
            ...normalizeOrdenRow(existingOrder.rows[0], schemaInfo),
            duplicated: true,
          },
          { status: 200 }
        )
      }
    }

    const zonaValue =
      parsedData.tipo_destino === "locativo"
        ? parsedData.zona
        : !schemaInfo.hasReferenciaOtro && parsedData.tipo_destino === "otro"
          ? `${OTRO_PREFIX}${parsedData.referencia_otro ?? ""}`
          : null
    const columns = [
      'codigo_equipo',
      'tipo_mantenimiento',
      'fecha_solicitud',
      'responsable',
      'descripcion_falla',
      'repuestos_utilizados',
      'prioridad',
      'estado',
      'hora_inicio',
      'hora_fin',
      'observaciones',
      'imagen_antes_url',
      'imagen_despues_url',
      'anexo_url',
    ]
    const values: any[] = [
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
    ]

    if (schemaInfo.hasZona) {
      columns.splice(1, 0, 'zona')
      values.splice(1, 0, zonaValue)
    }

    if (schemaInfo.hasReferenciaOtro) {
      columns.splice(schemaInfo.hasZona ? 2 : 1, 0, 'referencia_otro')
      values.splice(schemaInfo.hasZona ? 2 : 1, 0, parsedData.referencia_otro)
    }

    if (schemaInfo.hasOrigenOrden) {
      columns.push('origen_orden')
      values.push(parsedData.origen_orden)
    }

    if (schemaInfo.hasSolicitudId) {
      columns.push('solicitud_id')
      values.push(parsedData.solicitud_id)
    }

    if (schemaInfo.hasTipoDestino) {
      columns.push('tipo_destino')
      values.push(parsedData.tipo_destino)
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')

    const { rows } = await query(
      `INSERT INTO ordenes_mantenimiento (
         ${columns.join(', ')}
       ) VALUES (
         ${placeholders}
       )
       RETURNING *`,
      values,
    )

    return NextResponse.json(normalizeOrdenRow(rows[0], schemaInfo), { status: 201 })
  } catch (err) {
    console.error('Error insertando orden:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error guardando orden de mantenimiento' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    await ensureOrdenesSchema()
    const schemaInfo = await getOrdenesSchemaInfo()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const body = await req.json()
    body.fecha_solicitud = normalizeDateInput(body.fecha_solicitud)
    const zonaValue =
      body.tipo_destino === "locativo"
        ? body.zona
        : !schemaInfo.hasReferenciaOtro && body.tipo_destino === "otro"
          ? `${OTRO_PREFIX}${body.referencia_otro ?? ""}`
          : null

    const setClauses = [
      'codigo_equipo = $1',
      'tipo_mantenimiento = $2',
      'fecha_solicitud = $3',
      'responsable = $4',
      'descripcion_falla = $5',
      'repuestos_utilizados = $6',
      'prioridad = $7',
      'estado = $8',
      'hora_inicio = $9',
      'hora_fin = $10',
      'observaciones = $11',
      'imagen_antes_url = $12',
      'imagen_despues_url = $13',
      'anexo_url = $14',
    ]
    const values: any[] = [
      body.codigo_equipo,
      body.tipo_mantenimiento,
      body.fecha_solicitud,
      body.responsable,
      body.descripcion_falla,
      body.repuestos_utilizados,
      body.prioridad,
      body.estado,
      body.hora_inicio,
      body.hora_fin,
      body.observaciones,
      body.imagen_antes_url,
      body.imagen_despues_url,
      body.anexo_url,
    ]

    if (schemaInfo.hasZona) {
      setClauses.push(`zona = $${values.length + 1}`)
      values.push(zonaValue)
    }

    if (schemaInfo.hasReferenciaOtro) {
      setClauses.push(`referencia_otro = $${values.length + 1}`)
      values.push(body.referencia_otro)
    }

    if (schemaInfo.hasOrigenOrden) {
      setClauses.push(`origen_orden = $${values.length + 1}`)
      values.push(body.origen_orden ?? 'manual')
    }

    if (schemaInfo.hasSolicitudId) {
      setClauses.push(`solicitud_id = $${values.length + 1}`)
      values.push(body.solicitud_id ?? null)
    }

    if (schemaInfo.hasTipoDestino) {
      setClauses.push(`tipo_destino = $${values.length + 1}`)
      values.push(body.tipo_destino ?? 'equipo')
    }

    values.push(id)

    const { rows } = await query(
      `UPDATE ordenes_mantenimiento SET
         ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    return NextResponse.json(normalizeOrdenRow(rows[0], schemaInfo))
  } catch (err) {
    console.error('Error actualizando orden:', err)
    return NextResponse.json({ error: 'Error actualizando orden' }, { status: 500 })
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
      'DELETE FROM ordenes_mantenimiento WHERE id = $1 RETURNING *',
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Orden eliminada' })
  } catch (err) {
    console.error('Error eliminando orden:', err)
    return NextResponse.json({ error: 'Error eliminando orden' }, { status: 500 })
  }
}
