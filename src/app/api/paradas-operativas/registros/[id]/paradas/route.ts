import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import {
  mapParadaRow,
  type ParadaDetalleRow,
  type RegistroLineaRow,
} from "@/lib/paradas-operativas/db-mappers"
import { notificarParadaOperativa } from "@/lib/paradas-operativas/notifications"
import { buscarParadaDuplicada } from "@/lib/paradas-operativas/dedup"
import { getRegistroCompleto } from "@/lib/paradas-operativas/server-queries"
type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
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
    const parada = body.parada

    if (!parada) {
      return NextResponse.json({ error: "Datos de parada requeridos" }, { status: 400 })
    }

    const existente = await query(
      `SELECT id, estado FROM registros_linea_produccion WHERE id = $1`,
      [registroId],
    )

    const row = existente.rows[0] as RegistroLineaRow | undefined
    if (!row) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
    }

    if (row.estado !== "activo") {
      return NextResponse.json({ error: "No se pueden agregar paradas a un registro cerrado" }, { status: 400 })
    }

    const paradaDuplicadaId = await buscarParadaDuplicada(registroId, parada)
    if (paradaDuplicadaId) {
      const registro = await getRegistroCompleto(registroId)
      return NextResponse.json(registro, { status: 200 })
    }

    const { rows: paradaRows } = await query(
      `INSERT INTO paradas_operativas_detalle (
        registro_linea_id, hora_inicio, hora_fin, tiempo_minutos,
        motivo, observaciones, unidades_reales, unidades_no_conformes, responsable
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
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

    const registro = await getRegistroCompleto(registroId)
    const paradaCreada = paradaRows[0] as ParadaDetalleRow
    if (registro && paradaCreada) {
      void notificarParadaOperativa(registro, mapParadaRow(paradaCreada))
    }
    return NextResponse.json(registro, { status: 201 })
  } catch (err) {
    console.error("Error agregando parada:", err)
    return NextResponse.json({ error: "Error agregando parada" }, { status: 500 })
  }
}
