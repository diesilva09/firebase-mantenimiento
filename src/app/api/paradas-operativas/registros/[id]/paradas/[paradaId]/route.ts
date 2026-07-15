import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getRegistroCompleto } from "@/lib/paradas-operativas/server-queries"
import type { RegistroLineaRow } from "@/lib/paradas-operativas/db-mappers"

type RouteContext = { params: Promise<{ id: string; paradaId: string }> }

async function obtenerRegistroActivo(registroId: number) {
  const existente = await query(
    `SELECT id, estado FROM registros_linea_produccion WHERE id = $1`,
    [registroId],
  )
  return existente.rows[0] as RegistroLineaRow | undefined
}

export async function PATCH(req: Request, context: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 })
  }

  try {
    const { id, paradaId } = await context.params
    const registroId = Number(id)
    const paradaIdNum = Number(paradaId)

    if (Number.isNaN(registroId) || Number.isNaN(paradaIdNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const parada = body.parada

    if (!parada) {
      return NextResponse.json({ error: "Datos de parada requeridos" }, { status: 400 })
    }

    const row = await obtenerRegistroActivo(registroId)

    if (!row) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
    }

    if (row.estado !== "activo") {
      return NextResponse.json(
        { error: "No se pueden editar paradas de un registro cerrado" },
        { status: 400 },
      )
    }

    const actualizada = await query(
      `UPDATE paradas_operativas_detalle
       SET hora_inicio = $3,
           hora_fin = $4,
           tiempo_minutos = $5,
           motivo = $6,
           observaciones = $7,
           unidades_reales = $8,
           unidades_no_conformes = $9,
           responsable = $10
       WHERE id = $1 AND registro_linea_id = $2
       RETURNING id`,
      [
        paradaIdNum,
        registroId,
        parada.horaInicio,
        parada.horaFin,
        parada.tiempoMinutos,
        parada.motivo,
        parada.observaciones || null,
        parada.unidadesReales,
        parada.unidadesNoConformes ?? 0,
        parada.responsable,
      ],
    )

    if (actualizada.rowCount === 0) {
      return NextResponse.json({ error: "Parada no encontrada" }, { status: 404 })
    }

    const registro = await getRegistroCompleto(registroId)
    return NextResponse.json(registro)
  } catch (err) {
    console.error("Error actualizando parada:", err)
    return NextResponse.json({ error: "Error actualizando parada" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 })
  }

  try {
    const { id, paradaId } = await context.params
    const registroId = Number(id)
    const paradaIdNum = Number(paradaId)

    if (Number.isNaN(registroId) || Number.isNaN(paradaIdNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const row = await obtenerRegistroActivo(registroId)

    if (!row) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
    }

    if (row.estado !== "activo") {
      return NextResponse.json({ error: "No se pueden eliminar paradas de un registro cerrado" }, { status: 400 })
    }

    await query(
      `DELETE FROM paradas_operativas_detalle
       WHERE id = $1 AND registro_linea_id = $2`,
      [paradaIdNum, registroId],
    )

    const registro = await getRegistroCompleto(registroId)
    return NextResponse.json(registro)
  } catch (err) {
    console.error("Error eliminando parada:", err)
    return NextResponse.json({ error: "Error eliminando parada" }, { status: 500 })
  }
}
