import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { formatFecha, mapRegistroRow } from "@/lib/paradas-operativas/db-mappers"
import { ensureLineaPersonalizada } from "@/lib/paradas-operativas/lineas-personalizadas"
import { getAllRegistrosCompletos, getRegistroCompleto } from "@/lib/paradas-operativas/server-queries"
import { buscarAperturaDuplicada } from "@/lib/paradas-operativas/dedup"
import { notificarAperturaLinea } from "@/lib/paradas-operativas/notifications"
import type { RegistroLineaRow } from "@/lib/paradas-operativas/db-mappers"

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [], message: "No database configured" })
  }

  try {
    const data = await getAllRegistrosCompletos()
    return NextResponse.json({ data })
  } catch (err) {
    console.error("Error consultando registros de línea:", err)
    return NextResponse.json(
      { error: "Error consultando registros de línea" },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 })
  }

  try {
    const body = await req.json()
    const apertura = body.apertura

    if (!apertura) {
      return NextResponse.json({ error: "Datos de apertura requeridos" }, { status: 400 })
    }

    if (apertura.linea === "OTRA" && apertura.lineaOtra?.trim()) {
      await ensureLineaPersonalizada(apertura.lineaOtra)
    }

    const duplicadoId = await buscarAperturaDuplicada(apertura)
    if (duplicadoId) {
      const existente = await getRegistroCompleto(duplicadoId)
      return NextResponse.json(existente, { status: 200 })
    }

    const { rows } = await query(
      `INSERT INTO registros_linea_produccion (
        fecha, linea, linea_otra, turno, hora_inicio, fin_turno_programado,
        responsable_apertura, unidades_programadas, lote, estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'activo')
      RETURNING *`,
      [
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

    const registro = mapRegistroRow(rows[0] as RegistroLineaRow, [])
    void notificarAperturaLinea(registro)
    return NextResponse.json(registro, { status: 201 })
  } catch (err) {
    console.error("Error abriendo registro de línea:", err)
    const detalle = err instanceof Error ? err.message : "Error desconocido"
    const esTablaFaltante = detalle.includes("does not exist") || detalle.includes("no existe")
    return NextResponse.json(
      {
        error: esTablaFaltante
          ? "Faltan tablas en la base de datos. Aplica las migraciones de paradas operativas."
          : "Error abriendo registro de línea",
        detalle: process.env.NODE_ENV === "development" ? detalle : undefined,
      },
      { status: 500 },
    )
  }
}
