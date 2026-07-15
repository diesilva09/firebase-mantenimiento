import { query } from "@/lib/db"
import {
  mapRegistroRow,
  type ParadaDetalleRow,
  type RegistroLineaRow,
} from "@/lib/paradas-operativas/db-mappers"
import type { RegistroLineaProduccion } from "@/lib/paradas-operativas/types"

export async function getRegistroCompleto(
  id: number,
): Promise<RegistroLineaProduccion | null> {
  const { rows } = await query(
    `SELECT * FROM registros_linea_produccion WHERE id = $1`,
    [id],
  )
  const registro = rows[0] as RegistroLineaRow | undefined
  if (!registro) return null

  const { rows: paradas } = await query(
    `SELECT * FROM paradas_operativas_detalle
     WHERE registro_linea_id = $1
     ORDER BY creado_en ASC`,
    [id],
  )

  return mapRegistroRow(registro, paradas as ParadaDetalleRow[])
}

export async function getAllRegistrosCompletos(): Promise<RegistroLineaProduccion[]> {
  const { rows: registros } = await query(
    `SELECT * FROM registros_linea_produccion ORDER BY creado_en DESC`,
  )

  if ((registros as RegistroLineaRow[]).length === 0) return []

  const ids = (registros as RegistroLineaRow[]).map((r) => r.id)
  const { rows: paradas } = await query(
    `SELECT * FROM paradas_operativas_detalle
     WHERE registro_linea_id = ANY($1::int[])
     ORDER BY creado_en ASC`,
    [ids],
  )

  const paradasList = paradas as ParadaDetalleRow[]
  const paradasPorRegistro = new Map<number, ParadaDetalleRow[]>()
  for (const p of paradasList) {
    const list = paradasPorRegistro.get(p.registro_linea_id) ?? []
    list.push(p)
    paradasPorRegistro.set(p.registro_linea_id, list)
  }

  return (registros as RegistroLineaRow[]).map((r) =>
    mapRegistroRow(r, paradasPorRegistro.get(r.id) ?? []),
  )
}
