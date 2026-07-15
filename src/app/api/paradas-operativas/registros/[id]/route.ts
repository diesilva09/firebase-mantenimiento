import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { formatFecha } from "@/lib/paradas-operativas/db-mappers"
import { ensureLineaPersonalizada } from "@/lib/paradas-operativas/lineas-personalizadas"
import { getRegistroCompleto } from "@/lib/paradas-operativas/server-queries"
import { notificarCierreLinea } from "@/lib/paradas-operativas/notifications"
import type { RegistroLineaRow } from "@/lib/paradas-operativas/db-mappers"

type RouteContext = { params: Promise<{ id: string }> }

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
    const { id } = await context.params
    const registroId = Number(id)
    if (Number.isNaN(registroId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const row = await obtenerRegistroActivo(registroId)

    if (!row) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
    }

    if (body.apertura) {
      if (row.estado !== "activo") {
        return NextResponse.json(
          { error: "Solo se puede editar una línea activa" },
          { status: 400 },
        )
      }

      const apertura = body.apertura

      if (apertura.linea === "OTRA" && apertura.lineaOtra?.trim()) {
        await ensureLineaPersonalizada(apertura.lineaOtra)
      }

      await query(
        `UPDATE registros_linea_produccion
         SET fecha = $2,
             linea = $3,
             linea_otra = $4,
             turno = $5,
             hora_inicio = $6,
             fin_turno_programado = $7,
             responsable_apertura = $8,
             unidades_programadas = $9,
             lote = $10
         WHERE id = $1`,
        [
          registroId,
          formatFecha(new Date(apertura.fecha)),
          apertura.linea,
          apertura.linea === "OTRA" ? apertura.lineaOtra || null : null,
          apertura.turno,
          apertura.horaInicio,
          apertura.finTurnoProgramado,
          apertura.responsable,
          apertura.unidadesProgramadas,
          apertura.lote,
        ],
      )

      const registro = await getRegistroCompleto(registroId)
      return NextResponse.json(registro)
    }

    const cierre = body.cierre

    if (!cierre) {
      return NextResponse.json({ error: "Datos de cierre o apertura requeridos" }, { status: 400 })
    }

    if (row.estado === "cerrado") {
      return NextResponse.json({ error: "El registro ya está cerrado" }, { status: 400 })
    }

    const { rows: filasCerradas } = await query(
      `UPDATE registros_linea_produccion
       SET estado = 'cerrado',
           hora_finalizacion = $2,
           responsable_cierre = $3,
           unidades_reales_totales = $4,
           unidades_no_conformes_totales = $5,
           cerrado_en = CURRENT_TIMESTAMP
       WHERE id = $1 AND estado = 'activo'
       RETURNING id`,
      [
        registroId,
        cierre.horaFinalizacion,
        cierre.responsable,
        cierre.unidadesRealesTotales,
        cierre.unidadesNoConformesTotales ?? 0,
      ],
    )

    const registro = await getRegistroCompleto(registroId)
    if (!registro) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
    }

    if (filasCerradas.length > 0) {
      void notificarCierreLinea(registro)
    }

    return NextResponse.json(registro)
  } catch (err) {
    console.error("Error actualizando registro de línea:", err)
    return NextResponse.json({ error: "Error actualizando registro de línea" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 })
  }

  try {
    const { id } = await context.params
    const registroId = Number(id)
    if (Number.isNaN(registroId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const row = await obtenerRegistroActivo(registroId)

    if (!row) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
    }

    if (row.estado !== "activo") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar líneas activas" },
        { status: 400 },
      )
    }

    await query(`DELETE FROM registros_linea_produccion WHERE id = $1`, [registroId])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error eliminando registro de línea:", err)
    return NextResponse.json({ error: "Error eliminando registro de línea" }, { status: 500 })
  }
}
